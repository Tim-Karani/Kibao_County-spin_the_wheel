/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   admin.js

   Everything here reads and writes the shared state on the
   Netlify server (/api/admin). The password is checked by the
   server on every request; it is kept only in this browser tab
   (sessionStorage) and is forgotten when the tab is closed.
========================================================== */

"use strict";

const ADMIN_ENDPOINT = "/api/admin";
const PASSWORD_KEY = "kibao_admin_password";
const AUTO_REFRESH_MS = 15000;
const LOW_STOCK = 5;

const SLICE_COLORS = {
    1: "#FFFFFF", 2: "#771030", 3: "#DB1212", 4: "#F3BB17",
    5: "#FFFFFF", 6: "#771030", 7: "#DB1212", 8: "#F3BB17"
};

let password = "";
let currentState = null;
let formDirty = false;
let refreshTimer = null;
let busy = false;

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

function init(){

    $("loginForm").addEventListener("submit", onLogin);
    $("logoutBtn").addEventListener("click", logout);
    $("refreshBtn").addEventListener("click", () => refresh(true));
    $("saveBtn").addEventListener("click", savePrizes);
    $("discardBtn").addEventListener("click", () => { formDirty = false; renderPrizes(); });
    $("historySearch").addEventListener("input", renderHistory);
    $("historyFilter").addEventListener("change", renderHistory);
    $("exportBtn").addEventListener("click", exportCsv);
    $("resetStatsBtn").addEventListener("click", resetStats);
    $("restoreOddsBtn").addEventListener("click", restoreOdds);

    document.addEventListener("visibilitychange", () => {
        if(!document.hidden && password){
            refresh(false);
        }
    });

    try{
        password = sessionStorage.getItem(PASSWORD_KEY) || "";
    }
    catch{
        password = "";
    }

    if(password){
        login(password, true);
    }
    else{
        $("passwordInput").focus();
    }
}

/* ---------------- Server calls ---------------- */

async function api(action, extra = {}){

    const response = await fetch(ADMIN_ENDPOINT, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-admin-password": password
        },
        body: JSON.stringify({ action, ...extra }),
        cache: "no-store"
    });

    let data = {};

    try{
        data = await response.json();
    }
    catch{
        data = {};
    }

    if(response.status === 401){
        const error = new Error(data.error || "Wrong password.");
        error.unauthorized = true;
        throw error;
    }

    if(!response.ok){
        throw new Error(data.error || `Server error (${response.status}).`);
    }

    return data;
}

/* ---------------- Login ---------------- */

async function onLogin(event){

    event.preventDefault();

    const value = $("passwordInput").value;

    if(!value){
        return;
    }

    await login(value, false);
}

async function login(value, silent){

    password = value;
    $("loginBtn").disabled = true;
    $("loginError").textContent = "";

    try{
        const data = await api("login");

        try{
            sessionStorage.setItem(PASSWORD_KEY, password);
        }
        catch{
            /* Tab will just ask again after a reload. */
        }

        $("loginView").classList.add("hidden");
        $("dashboardView").classList.remove("hidden");
        $("passwordInput").value = "";

        applyState(data.state, true);
        startAutoRefresh();
    }
    catch(error){
        password = "";
        clearStoredPassword();
        if(!silent){
            $("loginError").textContent = error.unauthorized
                ? "Wrong password. Please try again."
                : error.message;
        }
    }
    finally{
        $("loginBtn").disabled = false;
    }
}

function logout(){
    password = "";
    currentState = null;
    formDirty = false;
    clearStoredPassword();
    stopAutoRefresh();
    $("dashboardView").classList.add("hidden");
    $("loginView").classList.remove("hidden");
    $("passwordInput").focus();
}

function clearStoredPassword(){
    try{
        sessionStorage.removeItem(PASSWORD_KEY);
    }
    catch{
        /* ignore */
    }
}

function handleError(error){
    if(error.unauthorized){
        logout();
        $("loginError").textContent = "Your session has ended. Please log in again.";
        return;
    }
    toast(error.message, true);
}

/* ---------------- Refresh ---------------- */

function startAutoRefresh(){
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
        if(!document.hidden){
            refresh(false);
        }
    }, AUTO_REFRESH_MS);
}

function stopAutoRefresh(){
    if(refreshTimer){
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

async function refresh(manual){

    if(busy){
        return;
    }

    try{
        const data = await api("state");
        applyState(data.state, false);
        if(manual){
            toast(formDirty ? "Updated. Your unsaved edits were kept." : "Updated.");
        }
    }
    catch(error){
        if(manual || error.unauthorized){
            handleError(error);
        }
    }
}

function applyState(state, forceForm){

    currentState = state;

    if(forceForm){
        formDirty = false;
    }

    renderStats();
    renderPrizes();
    renderHistory();

    $("lastUpdated").textContent = "Updated " + new Date().toLocaleTimeString();
}

/* ---------------- Stats ---------------- */

function renderStats(){

    const stats = currentState.stats;
    const spins = stats.totalSpins || 0;

    $("statSpins").textContent = formatNumber(spins);
    $("statWins").textContent = formatNumber(stats.totalWins || 0);
    $("statLosses").textContent = formatNumber(stats.totalLosses || 0);
    $("statRate").textContent = spins ? formatPercent((stats.totalWins / spins) * 100) : "–";

    const target = currentState.prizes
        .filter(p => p.type === "win")
        .reduce((sum, p) => sum + p.chance, 0);

    $("statRateTarget").textContent = `Set odds: ${formatPercent(target)}`;
}

/* ---------------- Prize table ---------------- */

function renderPrizes(){

    const body = $("prizeRows");

    if(formDirty && body.children.length){
        updateLiveCells();
        return;
    }

    body.innerHTML = "";

    currentState.prizes.forEach(prize => {

        const row = document.createElement("tr");
        row.dataset.slot = prize.designSlot;

        const isWin = prize.type === "win";
        const stockValue = prize.stock === null ? "" : prize.stock;

        row.innerHTML = `
            <td>
                <div class="slice-cell">
                    <span class="slice-swatch" style="background:${SLICE_COLORS[prize.designSlot]}"></span>
                    <div>
                        <div><strong>${escapeHtml(prize.name)}</strong></div>
                        <div class="slice-num">Slice ${prize.designSlot}</div>
                    </div>
                </div>
            </td>
            <td>
                <input type="number" class="chance-input" min="0" max="100" step="0.01"
                       value="${prize.chance}" data-original="${prize.chance}"
                       aria-label="${escapeHtml(prize.name)} chance (slice ${prize.designSlot})">
            </td>
            <td>
                ${isWin
                    ? `<input type="checkbox" class="active-input" ${prize.active ? "checked" : ""}
                              data-original="${prize.active}" aria-label="${escapeHtml(prize.name)} in play">`
                    : `<span class="muted">Always</span>`}
            </td>
            <td>
                ${isWin
                    ? `<input type="number" class="stock-input" min="0" step="1" placeholder="Unlimited"
                              value="${stockValue}" data-original="${stockValue}"
                              aria-label="${escapeHtml(prize.name)} stock left">`
                    : `<span class="muted">—</span>`}
            </td>
            <td class="num given-cell">${isWin ? formatNumber(prize.given) : "—"}</td>
            <td class="status-cell">${statusBadge(prize)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", onFormEdit);
        input.addEventListener("change", onFormEdit);
    });

    updateTotals();
    setPrizeMessage("");
}

/* While the admin is editing, only refresh the read-only cells. */
function updateLiveCells(){

    currentState.prizes.forEach(prize => {
        const row = $("prizeRows").querySelector(`tr[data-slot="${prize.designSlot}"]`);
        if(!row){
            return;
        }
        if(prize.type === "win"){
            row.querySelector(".given-cell").textContent = formatNumber(prize.given);
            const stockInput = row.querySelector(".stock-input");
            const stockValue = prize.stock === null ? "" : String(prize.stock);
            // Keep the live stock number visible unless the admin is changing it.
            if(stockInput && !stockInput.classList.contains("changed")){
                stockInput.value = stockValue;
                stockInput.dataset.original = stockValue;
            }
        }
        row.querySelector(".status-cell").innerHTML = statusBadge(prize);
    });
}

function statusBadge(prize){

    if(prize.type !== "win"){
        return `<span class="badge lose">Try Again</span>`;
    }
    if(!prize.active){
        return `<span class="badge paused">Paused</span>`;
    }
    if(prize.stock === 0){
        return `<span class="badge out">Out of stock</span>`;
    }
    if(prize.stock !== null && prize.stock <= LOW_STOCK){
        return `<span class="badge low">Low stock</span>`;
    }
    return `<span class="badge ok">${prize.stock === null ? "In play · unlimited" : "In play"}</span>`;
}

function onFormEdit(event){

    const input = event.target;
    const current = input.type === "checkbox" ? String(input.checked) : input.value;

    input.classList.toggle("changed", current !== input.dataset.original);

    formDirty = $("prizeRows").querySelectorAll(".changed").length > 0;

    updateTotals();
    setPrizeMessage(formDirty ? "You have unsaved changes." : "");
}

function updateTotals(){

    let total = 0;
    let win = 0;

    $("prizeRows").querySelectorAll("tr").forEach(row => {
        const slot = Number(row.dataset.slot);
        const prize = currentState.prizes.find(p => p.designSlot === slot);
        const chance = Number(row.querySelector(".chance-input").value) || 0;
        total += chance;
        if(prize && prize.type === "win"){
            win += chance;
        }
    });

    const totalCell = $("chanceTotal");
    totalCell.textContent = formatPercent(total);
    totalCell.classList.toggle("bad", Math.abs(total - 100) > 0.001);

    const oneIn = win > 0 ? ` (about 1 in ${Math.round(100 / win)} spins)` : "";
    $("winTotal").textContent = `Chance to win a prize: ${formatPercent(win)}${oneIn}. Must total 100%.`;
}

async function savePrizes(){

    const rows = $("prizeRows").querySelectorAll("tr");
    const edits = [];
    let total = 0;

    for(const row of rows){

        const edit = { designSlot: Number(row.dataset.slot) };
        const chanceInput = row.querySelector(".chance-input");
        const activeInput = row.querySelector(".active-input");
        const stockInput = row.querySelector(".stock-input");

        if(chanceInput.value === ""){
            setPrizeMessage("Every slice needs a chance (use 0 to never land on it).", true);
            chanceInput.focus();
            return;
        }

        edit.chance = Number(chanceInput.value);
        total += edit.chance;

        if(activeInput){
            edit.active = activeInput.checked;
        }

        // Only send stock when it was changed, so prizes given out
        // on other devices meanwhile are not overwritten.
        if(stockInput && stockInput.classList.contains("changed")){
            const value = stockInput.value.trim();
            if(value !== "" && (!/^\d+$/.test(value))){
                setPrizeMessage("Stock must be a whole number, or blank for unlimited.", true);
                stockInput.focus();
                return;
            }
            edit.stock = value === "" ? null : Number(value);
        }

        edits.push(edit);
    }

    if(Math.abs(total - 100) > 0.001){
        setPrizeMessage(`All chances must add up to 100%. They add up to ${formatPercent(total)}.`, true);
        return;
    }

    busy = true;
    $("saveBtn").disabled = true;

    try{
        const data = await api("savePrizes", { prizes: edits });
        formDirty = false;
        applyState(data.state, true);
        toast(data.message || "Saved.");
        setPrizeMessage("Saved. All devices now use these settings.", false, true);
    }
    catch(error){
        if(error.unauthorized){
            handleError(error);
        }
        else{
            setPrizeMessage(error.message, true);
        }
    }
    finally{
        busy = false;
        $("saveBtn").disabled = false;
    }
}

function setPrizeMessage(text, isError = false, isOk = false){
    const el = $("prizeMessage");
    el.textContent = text;
    el.classList.toggle("error", Boolean(isError));
    el.classList.toggle("ok", Boolean(isOk));
}

/* ---------------- History ---------------- */

function filteredHistory(){

    const query = $("historySearch").value.trim().toLowerCase();
    const filter = $("historyFilter").value;

    return (currentState.history || []).filter(item => {
        if(filter !== "all" && item.type !== filter){
            return false;
        }
        if(query && !`${item.prize} ${item.note || ""}`.toLowerCase().includes(query)){
            return false;
        }
        return true;
    });
}

function renderHistory(){

    if(!currentState){
        return;
    }

    const body = $("historyRows");
    const items = filteredHistory();

    if(!items.length){
        body.innerHTML = `<tr class="empty-row"><td colspan="4">No spins yet.</td></tr>`;
        return;
    }

    body.innerHTML = items.map(item => `
        <tr>
            <td class="num">${escapeHtml(formatDate(item.time))}</td>
            <td>${escapeHtml(item.prize)}</td>
            <td class="${item.type === "win" ? "result-win" : "result-lose"}">${item.type === "win" ? "Win" : "Loss"}</td>
            <td class="muted">${item.note ? escapeHtml(item.note.replace("unavailable", "out of stock / paused")) : ""}</td>
        </tr>
    `).join("");
}

function exportCsv(){

    if(!currentState){
        return;
    }

    const rows = [["Date & time", "Result", "Outcome", "Note"]];

    filteredHistory().forEach(item => {
        rows.push([formatDate(item.time), item.prize, item.type === "win" ? "Win" : "Loss", item.note || ""]);
    });

    rows.push([]);
    rows.push(["Prize", "Chance %", "In play", "Stock left", "Given out"]);
    currentState.prizes.filter(p => p.type === "win").forEach(p => {
        rows.push([p.name, p.chance, p.active ? "Yes" : "No", p.stock === null ? "Unlimited" : p.stock, p.given]);
    });

    const csv = rows
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

    link.href = url;
    link.download = `kibao-spin-history-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/* ---------------- Resets ---------------- */

async function resetStats(){

    if(!window.confirm("Clear all spin stats and history for every device? Stock is kept.")){
        return;
    }

    await runAction("resetStats");
}

async function restoreOdds(){

    if(!window.confirm("Restore the default odds (5% to win) on every device? Stock is kept.")){
        return;
    }

    await runAction("restoreDefaults");
}

async function runAction(action){

    busy = true;

    try{
        const data = await api(action);
        applyState(data.state, true);
        toast(data.message || "Done.");
    }
    catch(error){
        handleError(error);
    }
    finally{
        busy = false;
    }
}

/* ---------------- Helpers ---------------- */

let toastTimer = null;

function toast(message, isError = false){
    const el = $("toast");
    el.textContent = message;
    el.classList.toggle("error", isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function formatNumber(n){
    return Number(n || 0).toLocaleString();
}

function formatPercent(n){
    return `${Math.round(n * 100) / 100}%`;
}

function formatDate(iso){
    const date = new Date(iso);
    return isNaN(date) ? iso : date.toLocaleString();
}

function escapeHtml(value){
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
