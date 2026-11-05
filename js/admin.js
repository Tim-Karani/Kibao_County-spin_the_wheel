/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   admin.js

   Reads and changes the shared data on the Netlify server
   (/api/admin). The password is checked by the server on every
   request; it is kept only in this browser tab (sessionStorage)
   and is forgotten when the tab is closed.
========================================================== */

"use strict";

const ADMIN_ENDPOINT = "/api/admin";
const PASSWORD_KEY = "kibao_admin_password";
const AUTO_REFRESH_MS = 20000;
const LOW_STOCK = 3;

const SLICE_COLORS = {
    1: "#FFFFFF", 2: "#771030", 3: "#DB1212", 4: "#F3BB17",
    5: "#FFFFFF", 6: "#771030", 7: "#DB1212", 8: "#F3BB17"
};

let password = "";
let report = null;
let selectedDay = "";
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
    $("restoreOddsBtn").addEventListener("click", restoreOdds);
    $("daySelect").addEventListener("change", onDayChange);
    $("deviceSearch").addEventListener("input", renderDevices);
    $("historySearch").addEventListener("input", renderHistory);
    $("historyFilter").addEventListener("change", renderHistory);
    $("exportBtn").addEventListener("click", exportCsv);
    $("deviceRows").addEventListener("click", onDeviceAction);

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
        body: JSON.stringify({ action, day: selectedDay, ...extra }),
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
    if(value){
        await login(value, false);
    }
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

        applyReport(data.report, true);
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
    report = null;
    selectedDay = "";
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
        applyReport(data.report, false);
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

function onDayChange(){
    selectedDay = $("daySelect").value;
    refresh(false);
}

function applyReport(next, forceForm){

    // If the business day rolled over while viewing "today", follow it.
    if(report && selectedDay === report.today && next.today !== report.today){
        selectedDay = next.today;
    }

    report = next;
    selectedDay = report.day;

    if(forceForm){
        formDirty = false;
    }

    renderHeader();
    renderStats();
    renderPrizes();
    renderDevices();
    renderHistory();
}

/* ---------------- Header & stats ---------------- */

function dayLabel(day){
    const date = new Date(`${day}T12:00:00Z`);
    const text = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    return day === report.today ? `Today · ${text}` : text;
}

function renderHeader(){

    const select = $("daySelect");
    select.innerHTML = report.days
        .map(day => `<option value="${day}" ${day === report.day ? "selected" : ""}>${escapeHtml(dayLabel(day))}</option>`)
        .join("");

    const refill = new Date(report.nextRefill);
    $("refillInfo").textContent =
        `Stock refills daily at ${report.refillHour}:00 am · next refill ${refill.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`;

    $("dayTitle").textContent = report.day === report.today
        ? `Today (${dayLabel(report.day).replace("Today · ", "")}, from ${report.refillHour}:00 am)`
        : `${dayLabel(report.day)} (${report.refillHour}:00 am to ${report.refillHour}:00 am next day)`;
}

function renderStats(){

    const t = report.totals;

    $("statDevices").textContent = formatNumber(report.activeDevices);
    $("statDevicesTotal").textContent = `${formatNumber(report.devices.length)} registered in total`;
    $("statSpins").textContent = formatNumber(t.spins);
    $("statWins").textContent = formatNumber(t.wins);
    $("statLosses").textContent = formatNumber(t.losses);
    $("statRate").textContent = t.spins ? formatPercent((t.wins / t.spins) * 100) : "–";

    const target = winPrizes().reduce((sum, p) => sum + p.chance, 0);
    $("statRateTarget").textContent = `Set odds: ${formatPercent(target)}`;

    const a = report.allTime;
    const parts = winPrizes().map(p => `${p.name} ${formatNumber(a.given[p.designSlot] || 0)}`);
    $("allTime").textContent =
        `All days so far: ${formatNumber(a.spins)} spins, ${formatNumber(a.wins)} gifts given (${parts.join(", ")}).`;
}

function winPrizes(){
    return report.config.prizes.filter(p => p.type === "win");
}

/* ---------------- Prize table ---------------- */

function renderPrizes(){

    const body = $("prizeRows");
    const isToday = report.day === report.today;

    $("givenHeader").textContent = isToday ? "Given today (all devices)" : "Given that day (all devices)";

    if(formDirty && body.children.length){
        updatePrizeLiveCells();
        return;
    }

    body.innerHTML = "";

    report.config.prizes.forEach(prize => {

        const row = document.createElement("tr");
        row.dataset.slot = prize.designSlot;

        const isWin = prize.type === "win";
        const stockValue = prize.dailyStock === null ? "" : prize.dailyStock;

        row.innerHTML = `
            <td>
                <div class="slice-cell">
                    <span class="slice-swatch" style="background:${SLICE_COLORS[prize.designSlot]}"></span>
                    <div>
                        <div><strong>${escapeHtml(prize.name)}</strong></div>
                        <div class="slice-num">Slice ${prize.designSlot}${prize.brand ? " · " + escapeHtml(prize.brand) : ""}</div>
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
                              aria-label="${escapeHtml(prize.name)} daily stock per device">`
                    : `<span class="muted">—</span>`}
            </td>
            <td class="num given-cell">${isWin ? formatNumber(report.totals.given[prize.designSlot] || 0) : "—"}</td>
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

function updatePrizeLiveCells(){
    winPrizes().forEach(prize => {
        const row = $("prizeRows").querySelector(`tr[data-slot="${prize.designSlot}"]`);
        if(row){
            row.querySelector(".given-cell").textContent = formatNumber(report.totals.given[prize.designSlot] || 0);
        }
    });
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
        const prize = report.config.prizes.find(p => p.designSlot === Number(row.dataset.slot));
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
    $("winTotal").textContent = `Chance to win a gift: ${formatPercent(win)}${oneIn}. Must total 100%.`;
}

async function savePrizes(){

    const edits = [];
    let total = 0;

    for(const row of $("prizeRows").querySelectorAll("tr")){

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

        if(stockInput){
            const value = stockInput.value.trim();
            if(value !== "" && !/^\d+$/.test(value)){
                setPrizeMessage("Daily stock must be a whole number, or blank for unlimited.", true);
                stockInput.focus();
                return;
            }
            edit.dailyStock = value === "" ? null : Number(value);
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
        applyReport(data.report, true);
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

async function restoreOdds(){
    if(window.confirm("Restore the default odds (1.25% per gift, 5% to win) on every device? Daily stock is kept.")){
        await runAction("restoreDefaults");
    }
}

function setPrizeMessage(text, isError = false, isOk = false){
    const el = $("prizeMessage");
    el.textContent = text;
    el.classList.toggle("error", Boolean(isError));
    el.classList.toggle("ok", Boolean(isOk));
}

/* ---------------- Devices ---------------- */

function renderDevices(){

    const isToday = report.day === report.today;
    const prizes = winPrizes();

    $("deviceHead").innerHTML = `
        <tr>
            <th>Device</th>
            <th>Last active</th>
            <th>Spins</th>
            ${prizes.map(p => `<th>${escapeHtml(p.name)}</th>`).join("")}
            <th>Status</th>
            <th>Actions</th>
        </tr>`;

    $("devicesHint").textContent = isToday
        ? "Each tablet set up with the setup code counts as one outlet. Gifts shown as given today / daily stock."
        : "Gifts given by each device on the selected day.";

    const query = $("deviceSearch").value.trim().toLowerCase();
    const rows = report.devices.filter(d =>
        !query || `${d.label} ${d.code}`.toLowerCase().includes(query)
    );

    if(!rows.length){
        $("deviceRows").innerHTML = `<tr class="empty-row"><td colspan="${prizes.length + 5}">${
            report.devices.length ? "No devices match your search." : "No devices yet. Open the game on a tablet and enter the setup code."
        }</td></tr>`;
        return;
    }

    $("deviceRows").innerHTML = rows.map(d => {

        const giftCells = d.prizes.map(p => {
            if(!isToday || p.stock === null){
                return `<td class="gift-count">${formatNumber(p.given)}</td>`;
            }
            const cls = p.left === 0 ? "out" : p.left <= LOW_STOCK ? "low" : "";
            const title = p.left === 0 ? "Out of stock today" : `${p.left} left today`;
            return `<td class="gift-count ${cls}" title="${title}">${p.given} / ${p.stock}</td>`;
        }).join("");

        return `
            <tr class="${d.blocked ? "is-blocked" : ""}" data-id="${d.id}">
                <td>
                    <div class="device-name">${escapeHtml(d.label)}</div>
                    <div class="device-code">ID …${escapeHtml(d.code)}</div>
                </td>
                <td>${d.lastSeen ? escapeHtml(formatRelative(d.lastSeen)) : "–"}</td>
                <td class="num">${formatNumber(d.spins)}</td>
                ${giftCells}
                <td>${d.blocked ? `<span class="badge out">Disabled</span>` : `<span class="badge ok">Active</span>`}</td>
                <td class="actions-cell">
                    <div class="row-actions">
                        <button type="button" class="btn btn-light btn-small" data-action="rename">Rename</button>
                        ${isToday ? `<button type="button" class="btn btn-light btn-small" data-action="refill">Refill today</button>` : ""}
                        <button type="button" class="btn btn-small btn-text-danger" data-action="${d.blocked ? "enable" : "disable"}">${d.blocked ? "Enable" : "Disable"}</button>
                    </div>
                </td>
            </tr>`;
    }).join("");
}

async function onDeviceAction(event){

    const button = event.target.closest("button[data-action]");

    if(!button){
        return;
    }

    const row = button.closest("tr");
    const device = report.devices.find(d => d.id === row.dataset.id);

    if(!device){
        return;
    }

    switch(button.dataset.action){

        case "rename":{
            const name = window.prompt("Name for this device (e.g. Tablet 3 – Nairobi North):", device.name || "");
            if(name !== null){
                await runAction("renameDevice", { deviceId: device.id, name });
            }
            break;
        }

        case "refill":
            if(window.confirm(`Refill today's stock on "${device.label}"? Its gift counts for today go back to 0, so it can give out the full daily stock again.`)){
                await runAction("refillDevice", { deviceId: device.id });
            }
            break;

        case "disable":
            if(window.confirm(`Disable "${device.label}"? It will no longer be able to spin until you enable it again.`)){
                await runAction("setBlocked", { deviceId: device.id, blocked: true });
            }
            break;

        case "enable":
            await runAction("setBlocked", { deviceId: device.id, blocked: false });
            break;
    }
}

/* ---------------- History ---------------- */

function filteredHistory(){

    const query = $("historySearch").value.trim().toLowerCase();
    const filter = $("historyFilter").value;

    return report.history.filter(item => {
        if(filter !== "all" && item.type !== filter){
            return false;
        }
        if(query && !`${item.device} ${item.prize} ${item.note}`.toLowerCase().includes(query)){
            return false;
        }
        return true;
    });
}

function renderHistory(){

    if(!report){
        return;
    }

    const items = filteredHistory();
    const shown = items.slice(0, 500);

    $("historyHint").textContent = items.length > shown.length
        ? `Showing the latest 500 of ${formatNumber(items.length)} spins. Export CSV for all of them.`
        : "All spins on the selected day, from every device.";

    if(!shown.length){
        $("historyRows").innerHTML = `<tr class="empty-row"><td colspan="5">No spins for this day yet.</td></tr>`;
        return;
    }

    $("historyRows").innerHTML = shown.map(item => `
        <tr>
            <td class="num">${escapeHtml(formatDate(item.time))}</td>
            <td>${escapeHtml(item.device)}</td>
            <td>${escapeHtml(item.prize)}</td>
            <td class="${item.type === "win" ? "result-win" : "result-lose"}">${item.type === "win" ? "Win" : "Loss"}</td>
            <td class="muted">${escapeHtml(item.note)}</td>
        </tr>
    `).join("");
}

function exportCsv(){

    if(!report){
        return;
    }

    const prizes = winPrizes();
    const rows = [];

    rows.push([`County Kibao Spin the Wheel – ${report.day} (${report.refillHour}:00 am to ${report.refillHour}:00 am)`]);
    rows.push([]);
    rows.push(["Device", "Device ID", "Spins", "Wins", "Losses", ...prizes.map(p => `${p.name} given`), "Status"]);

    report.devices.forEach(d => {
        rows.push([
            d.label, d.code, d.spins, d.wins, d.losses,
            ...d.prizes.map(p => p.given),
            d.blocked ? "Disabled" : "Active"
        ]);
    });

    rows.push([
        "TOTAL", "", report.totals.spins, report.totals.wins, report.totals.losses,
        ...prizes.map(p => report.totals.given[p.designSlot] || 0), ""
    ]);

    rows.push([]);
    rows.push(["Date & time", "Device", "Result", "Outcome", "Note"]);

    filteredHistory().forEach(item => {
        rows.push([formatDate(item.time), item.device, item.prize, item.type === "win" ? "Win" : "Loss", item.note]);
    });

    const csv = rows
        .map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `kibao-spin-${report.day}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/* ---------------- Actions ---------------- */

async function runAction(action, extra = {}){

    busy = true;

    try{
        const data = await api(action, extra);
        applyReport(data.report, action === "restoreDefaults");
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

function formatRelative(iso){
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diff / 60000);
    if(minutes < 1){
        return "just now";
    }
    if(minutes < 60){
        return `${minutes} min ago`;
    }
    if(minutes < 60 * 24){
        return `${Math.round(minutes / 60)} h ago`;
    }
    return new Date(iso).toLocaleDateString();
}

function escapeHtml(value){
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
