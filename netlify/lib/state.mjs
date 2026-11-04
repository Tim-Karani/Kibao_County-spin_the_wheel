/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   Shared game state (stored in Netlify Blobs)

   Every device talks to the same Netlify site, so prize odds,
   stock and statistics live here, on the server, instead of in
   each browser.
========================================================== */

import { getStore } from "@netlify/blobs";
import { randomInt, createHash, timingSafeEqual } from "node:crypto";

const STORE_NAME = "kibao-spin-the-wheel";
const STATE_KEY = "state-v1";
const HISTORY_LIMIT = 1000;

/*
 * The wheel artwork has eight fixed slices, numbered clockwise
 * from the slice just right of the pointer (Bucket Hat).
 * Names and types are tied to the artwork and cannot be changed
 * from the admin page, so a saved setting can never point a
 * result at the wrong picture.
 *
 * Default odds: 1.25% per prize (5% total), 23.75% per
 * Try Again slice (95% total).
 * stock: null = unlimited, a number = items left to give away.
 */
export const DEFAULT_PRIZES = [
    { designSlot: 1, name: "Bucket Hat",          type: "win",  chance: 1.25,  active: true, stock: null, given: 0 },
    { designSlot: 2, name: "Try Again Next Time", type: "lose", chance: 23.75, active: true, stock: null, given: 0 },
    { designSlot: 3, name: "T-Shirt",             type: "win",  chance: 1.25,  active: true, stock: null, given: 0 },
    { designSlot: 4, name: "Try Again Next Time", type: "lose", chance: 23.75, active: true, stock: null, given: 0 },
    { designSlot: 5, name: "Wristband",           type: "win",  chance: 1.25,  active: true, stock: null, given: 0 },
    { designSlot: 6, name: "Try Again Next Time", type: "lose", chance: 23.75, active: true, stock: null, given: 0 },
    { designSlot: 7, name: "Tumbler",             type: "win",  chance: 1.25,  active: true, stock: null, given: 0 },
    { designSlot: 8, name: "Try Again Next Time", type: "lose", chance: 23.75, active: true, stock: null, given: 0 }
];

function emptyStats(){
    return {
        totalSpins: 0,
        totalWins: 0,
        totalLosses: 0,
        outOfStockHits: 0,
        prizeCounts: {},
        since: new Date().toISOString()
    };
}

export function defaultState(){
    return {
        version: 1,
        prizes: DEFAULT_PRIZES.map(p => ({ ...p })),
        stats: emptyStats(),
        history: [],
        updatedAt: new Date().toISOString()
    };
}

/* Fill in anything missing so older or partial data never breaks the game. */
function normalizeState(raw){

    const state = defaultState();

    if(!raw || typeof raw !== "object"){
        return state;
    }

    const saved = Array.isArray(raw.prizes) ? raw.prizes : [];

    state.prizes = DEFAULT_PRIZES.map(def => {
        const found = saved.find(p => Number(p.designSlot) === def.designSlot) || {};
        return {
            ...def,
            chance: isFiniteNumber(found.chance) ? Number(found.chance) : def.chance,
            active: typeof found.active === "boolean" ? found.active : def.active,
            stock: found.stock === null || found.stock === undefined
                ? null
                : Math.max(0, Math.floor(Number(found.stock)) || 0),
            given: Math.max(0, Math.floor(Number(found.given)) || 0)
        };
    });

    state.stats = { ...emptyStats(), ...(raw.stats || {}) };
    state.stats.prizeCounts = { ...(raw.stats && raw.stats.prizeCounts) };
    state.history = Array.isArray(raw.history) ? raw.history.slice(0, HISTORY_LIMIT) : [];
    state.updatedAt = raw.updatedAt || state.updatedAt;

    return state;
}

function isFiniteNumber(value){
    return value !== null && value !== "" && Number.isFinite(Number(value));
}

function store(){
    return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function readState(){
    const entry = await store().get(STATE_KEY, { type: "json" });
    return normalizeState(entry);
}

/*
 * Read-modify-write with optimistic locking. If two devices
 * spin at the same moment, one write is rejected and retried,
 * so stock can never be given out twice.
 */
export async function updateState(mutator){

    const blobs = store();

    for(let attempt = 0; attempt < 12; attempt++){

        const entry = await blobs.getWithMetadata(STATE_KEY, { type: "json" });
        const state = normalizeState(entry ? entry.data : null);
        const result = mutator(state);

        state.updatedAt = new Date().toISOString();

        const options = entry && entry.etag
            ? { onlyIfMatch: entry.etag }
            : { onlyIfNew: true };

        const write = await blobs.setJSON(STATE_KEY, state, options);

        if(write && write.modified === false){
            await sleep(40 + Math.floor(Math.random() * 120) * (attempt + 1));
            continue;
        }

        return { state, result };
    }

    throw new Error("The game is busy. Please try again.");
}

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* Cryptographically random number in [0, max). */
function randomBelow(max){
    return (randomInt(0, 2 ** 47) / 2 ** 47) * max;
}

function pickWeighted(list){

    const total = list.reduce((sum, p) => sum + Math.max(0, p.chance), 0);

    if(total <= 0){
        return list[randomInt(0, list.length)];
    }

    let roll = randomBelow(total);

    for(const item of list){
        roll -= Math.max(0, item.chance);
        if(roll < 0){
            return item;
        }
    }

    return list[list.length - 1];
}

export function prizeAvailable(prize){
    return prize.type !== "win" || (prize.active && (prize.stock === null || prize.stock > 0));
}

/*
 * One spin. Odds are drawn exactly as configured. If the chosen
 * prize is paused or out of stock, the player gets a Try Again
 * slice instead, so a prize's own odds never grow when another
 * prize runs out.
 */
export function drawSpin(state){

    const drawn = pickWeighted(state.prizes);
    let result = drawn;
    let note = "";

    if(!prizeAvailable(drawn)){
        const lossSlices = state.prizes.filter(p => p.type !== "win");
        result = pickWeighted(lossSlices);
        note = `${drawn.name} unavailable`;
        state.stats.outOfStockHits++;
    }

    if(result.type === "win"){
        if(result.stock !== null){
            result.stock = Math.max(0, result.stock - 1);
        }
        result.given++;
        state.stats.totalWins++;
    }
    else{
        state.stats.totalLosses++;
    }

    state.stats.totalSpins++;
    state.stats.prizeCounts[result.name] = (state.stats.prizeCounts[result.name] || 0) + 1;

    const entry = {
        id: Date.now().toString(36) + randomInt(0, 1e6).toString(36),
        time: new Date().toISOString(),
        designSlot: result.designSlot,
        prize: result.name,
        type: result.type
    };

    if(note){
        entry.note = note;
    }

    state.history.unshift(entry);

    if(state.history.length > HISTORY_LIMIT){
        state.history.length = HISTORY_LIMIT;
    }

    return {
        designSlot: result.designSlot,
        name: result.name,
        type: result.type
    };
}

/* ---------------- Admin helpers ---------------- */

export function checkPassword(request){

    const expected = process.env.ADMIN_PASSWORD || "";

    if(!expected){
        return { ok: false, status: 503, error: "ADMIN_PASSWORD has not been set in Netlify." };
    }

    const given = request.headers.get("x-admin-password") || "";
    const a = createHash("sha256").update(given).digest();
    const b = createHash("sha256").update(expected).digest();

    if(!timingSafeEqual(a, b)){
        return { ok: false, status: 401, error: "Wrong password." };
    }

    return { ok: true };
}

/*
 * Apply admin edits. Only chance, active and stock can change.
 * Stock is only touched when the admin actually typed a new
 * value, so spins happening meanwhile are not overwritten.
 */
export function applyPrizeEdits(state, edits){

    if(!Array.isArray(edits)){
        throw new Error("No prize settings were sent.");
    }

    const next = state.prizes.map(p => ({ ...p }));

    for(const edit of edits){

        const prize = next.find(p => p.designSlot === Number(edit.designSlot));

        if(!prize){
            continue;
        }

        if("chance" in edit){
            const chance = Number(edit.chance);
            if(!Number.isFinite(chance) || chance < 0 || chance > 100){
                throw new Error(`${prize.name}: chance must be between 0 and 100.`);
            }
            prize.chance = Math.round(chance * 1000) / 1000;
        }

        if("active" in edit && prize.type === "win"){
            prize.active = Boolean(edit.active);
        }

        if("stock" in edit && prize.type === "win"){
            if(edit.stock === null || edit.stock === ""){
                prize.stock = null;
            }
            else{
                const stock = Number(edit.stock);
                if(!Number.isInteger(stock) || stock < 0){
                    throw new Error(`${prize.name}: stock must be a whole number (or blank for unlimited).`);
                }
                prize.stock = stock;
            }
        }
    }

    const total = next.reduce((sum, p) => sum + p.chance, 0);

    if(Math.abs(total - 100) > 0.001){
        throw new Error(`All eight chances must add up to 100%. They currently add up to ${round(total)}%.`);
    }

    state.prizes = next;
}

function round(n){
    return Math.round(n * 1000) / 1000;
}

export function resetStats(state){
    state.stats = emptyStats();
    state.history = [];
}

export function restoreDefaultOdds(state){
    state.prizes = state.prizes.map(p => {
        const def = DEFAULT_PRIZES.find(d => d.designSlot === p.designSlot);
        return { ...p, chance: def.chance, active: true };
    });
}

export function json(body, status = 200){
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store"
        }
    });
}
