/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   Shared game data (stored in Netlify Blobs)

   - Each registered device (tablet) counts as one outlet.
   - Every device gets the full daily stock of each prize.
   - Stock refills every day at 06:00 Nairobi time; unused
     gifts do not carry over.
   - Odds and daily stock are set once (admin page) and apply
     to every device.
========================================================== */

import { getStore } from "@netlify/blobs";
import { randomInt, randomBytes, createHash, timingSafeEqual } from "node:crypto";

const STORE_NAME = "kibao-spin-the-wheel";
const CONFIG_KEY = "config-v2";
const DEVICE_PREFIX = "device/";
const DAY_HISTORY_LIMIT = 3000;

/* Business day: Nairobi is UTC+3 all year (no daylight saving).
   The day changes at 06:00, so a late Saturday night still counts
   as Saturday. */
export const TIMEZONE_OFFSET_HOURS = 3;
export const REFILL_HOUR = 6;

/*
 * The wheel artwork has eight fixed slices, numbered clockwise
 * from the slice just right of the pointer.
 * chance: % per spin. dailyStock: gifts per device per day
 * (null = unlimited).
 */
export const DEFAULT_PRIZES = [
    { designSlot: 1, name: "County Bucket Hat",   brand: "County", type: "win",  chance: 1.25,  active: true, dailyStock: 10 },
    { designSlot: 2, name: "Try Again Next Time", brand: "",       type: "lose", chance: 23.75, active: true, dailyStock: null },
    { designSlot: 3, name: "Kibao T-Shirt",       brand: "Kibao",  type: "win",  chance: 1.25,  active: true, dailyStock: 20 },
    { designSlot: 4, name: "Try Again Next Time", brand: "",       type: "lose", chance: 23.75, active: true, dailyStock: null },
    { designSlot: 5, name: "County T-Shirt",      brand: "County", type: "win",  chance: 1.25,  active: true, dailyStock: 20 },
    { designSlot: 6, name: "Try Again Next Time", brand: "",       type: "lose", chance: 23.75, active: true, dailyStock: null },
    { designSlot: 7, name: "Kibao Tumbler",       brand: "Kibao",  type: "win",  chance: 1.25,  active: true, dailyStock: 20 },
    { designSlot: 8, name: "Try Again Next Time", brand: "",       type: "lose", chance: 23.75, active: true, dailyStock: null }
];

/* ---------------- Store helpers ---------------- */

function store(){
    return getStore({ name: STORE_NAME, consistency: "strong" });
}

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

/*
 * Read-modify-write one blob with optimistic locking: if another
 * request changed it in between, the write is rejected and retried.
 * mutator(data) may return a value; returning undefined data is not
 * allowed (throw to abort).
 */
async function updateBlob(key, normalize, mutator){

    const blobs = store();

    for(let attempt = 0; attempt < 12; attempt++){

        const entry = await blobs.getWithMetadata(key, { type: "json" });
        const data = normalize(entry ? entry.data : null);
        const result = mutator(data);

        const options = entry && entry.etag
            ? { onlyIfMatch: entry.etag }
            : { onlyIfNew: true };

        const write = await blobs.setJSON(key, data, options);

        if(write && write.modified === false){
            await sleep(30 + Math.floor(Math.random() * 100) * (attempt + 1));
            continue;
        }

        return { data, result };
    }

    throw new Error("The game is busy. Please try again.");
}

/* ---------------- Time ---------------- */

/* The business day (YYYY-MM-DD) a moment belongs to. */
export function dayKey(time = Date.now()){
    const shifted = new Date(time + (TIMEZONE_OFFSET_HOURS - REFILL_HOUR) * 3600 * 1000);
    return shifted.toISOString().slice(0, 10);
}

/* When the current business day ends (next refill), as ISO time. */
export function nextRefillTime(time = Date.now()){
    const today = dayKey(time);
    const start = Date.parse(`${today}T00:00:00Z`) - (TIMEZONE_OFFSET_HOURS - REFILL_HOUR) * 3600 * 1000;
    return new Date(start + 24 * 3600 * 1000).toISOString();
}

/* ---------------- Config (odds + daily stock) ---------------- */

function isFiniteNumber(value){
    return value !== null && value !== "" && value !== undefined && Number.isFinite(Number(value));
}

function normalizeConfig(raw){

    const saved = raw && Array.isArray(raw.prizes) ? raw.prizes : [];

    return {
        version: 2,
        prizes: DEFAULT_PRIZES.map(def => {
            const found = saved.find(p => Number(p.designSlot) === def.designSlot) || {};
            return {
                ...def,
                chance: isFiniteNumber(found.chance) ? Number(found.chance) : def.chance,
                active: typeof found.active === "boolean" ? found.active : def.active,
                dailyStock: def.type !== "win"
                    ? null
                    : found.dailyStock === null
                        ? null
                        : isFiniteNumber(found.dailyStock)
                            ? Math.max(0, Math.floor(Number(found.dailyStock)))
                            : def.dailyStock
            };
        }),
        updatedAt: (raw && raw.updatedAt) || null
    };
}

export async function readConfig(){
    const raw = await store().get(CONFIG_KEY, { type: "json" });
    return normalizeConfig(raw);
}

export async function updateConfig(mutator){
    const { data } = await updateBlob(CONFIG_KEY, normalizeConfig, config => {
        mutator(config);
        config.updatedAt = new Date().toISOString();
    });
    return data;
}

/* ---------------- Devices ---------------- */

const DEVICE_ID_PATTERN = /^d_[a-f0-9]{24}$/;

export function isValidDeviceId(id){
    return typeof id === "string" && DEVICE_ID_PATTERN.test(id);
}

export function shortCode(id){
    return id.slice(-4).toUpperCase();
}

function emptyDay(){
    return { spins: 0, wins: 0, losses: 0, outOfStockHits: 0, given: {}, history: [] };
}

function normalizeDevice(raw){

    if(!raw || typeof raw !== "object"){
        return null;
    }

    const days = raw.days && typeof raw.days === "object" ? raw.days : {};

    Object.keys(days).forEach(key => {
        days[key] = { ...emptyDay(), ...days[key] };
        days[key].given = { ...days[key].given };
        days[key].history = Array.isArray(days[key].history) ? days[key].history : [];
    });

    return {
        id: raw.id,
        name: typeof raw.name === "string" ? raw.name : "",
        blocked: Boolean(raw.blocked),
        createdAt: raw.createdAt || null,
        lastSeen: raw.lastSeen || null,
        days
    };
}

export async function readDevice(id){
    if(!isValidDeviceId(id)){
        return null;
    }
    const raw = await store().get(DEVICE_PREFIX + id, { type: "json" });
    return normalizeDevice(raw);
}

export async function createDevice(name){

    const id = "d_" + randomBytes(12).toString("hex");
    const now = new Date().toISOString();
    const device = {
        id,
        name: String(name || "").trim().slice(0, 60),
        blocked: false,
        createdAt: now,
        lastSeen: now,
        days: {}
    };

    const write = await store().setJSON(DEVICE_PREFIX + id, device, { onlyIfNew: true });

    if(write && write.modified === false){
        throw new Error("Could not register this device. Please try again.");
    }

    return device;
}

/* Update a device; mutator receives the device (never null). */
export async function updateDevice(id, mutator){

    if(!isValidDeviceId(id)){
        throw Object.assign(new Error("Unknown device."), { code: "unknown" });
    }

    const { data, result } = await updateBlob(DEVICE_PREFIX + id, normalizeDevice, device => {
        if(!device){
            throw Object.assign(new Error("Unknown device."), { code: "unknown" });
        }
        return mutator(device);
    });

    return { device: data, result };
}

export async function listDevices(){

    const blobs = store();
    const { blobs: entries = [] } = await blobs.list({ prefix: DEVICE_PREFIX });

    const devices = await Promise.all(
        entries.map(entry => blobs.get(entry.key, { type: "json" }).then(normalizeDevice))
    );

    return devices.filter(Boolean);
}

/* ---------------- Spinning ---------------- */

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

export function stockLeft(prize, day){
    if(prize.type !== "win" || prize.dailyStock === null){
        return null;
    }
    return Math.max(0, prize.dailyStock - (day.given[prize.designSlot] || 0));
}

function prizeAvailable(prize, day){
    if(prize.type !== "win"){
        return true;
    }
    if(!prize.active){
        return false;
    }
    const left = stockLeft(prize, day);
    return left === null || left > 0;
}

/*
 * One spin on one device. Odds are drawn exactly as configured. If
 * the chosen prize is paused or this device has given out today's
 * stock, the player gets a Try Again slice instead.
 */
export function drawSpin(config, device, time = Date.now()){

    const today = dayKey(time);

    if(!device.days[today]){
        device.days[today] = emptyDay();
    }

    const day = device.days[today];
    const drawn = pickWeighted(config.prizes);
    let result = drawn;
    let unavailable = false;

    if(!prizeAvailable(drawn, day)){
        result = pickWeighted(config.prizes.filter(p => p.type !== "win"));
        unavailable = true;
        day.outOfStockHits++;
    }

    if(result.type === "win"){
        day.given[result.designSlot] = (day.given[result.designSlot] || 0) + 1;
        day.wins++;
    }
    else{
        day.losses++;
    }

    day.spins++;

    const entry = { t: new Date(time).toISOString(), s: result.designSlot };

    if(unavailable){
        entry.u = drawn.designSlot;
    }

    day.history.unshift(entry);

    if(day.history.length > DAY_HISTORY_LIMIT){
        day.history.length = DAY_HISTORY_LIMIT;
    }

    device.lastSeen = new Date(time).toISOString();

    return {
        designSlot: result.designSlot,
        name: result.name,
        type: result.type
    };
}

/* ---------------- Admin ---------------- */

function safeEqual(given, expected){
    const a = createHash("sha256").update(String(given)).digest();
    const b = createHash("sha256").update(String(expected)).digest();
    return timingSafeEqual(a, b);
}

export function checkPassword(request){

    const expected = process.env.ADMIN_PASSWORD || "";

    if(!expected){
        return { ok: false, status: 503, error: "ADMIN_PASSWORD has not been set in Netlify." };
    }

    if(!safeEqual(request.headers.get("x-admin-password") || "", expected)){
        return { ok: false, status: 401, error: "Wrong password." };
    }

    return { ok: true };
}

export function applyPrizeEdits(config, edits){

    if(!Array.isArray(edits)){
        throw new Error("No prize settings were sent.");
    }

    const next = config.prizes.map(p => ({ ...p }));

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

        if("dailyStock" in edit && prize.type === "win"){
            if(edit.dailyStock === null || edit.dailyStock === ""){
                prize.dailyStock = null;
            }
            else{
                const stock = Number(edit.dailyStock);
                if(!Number.isInteger(stock) || stock < 0){
                    throw new Error(`${prize.name}: daily stock must be a whole number (or blank for unlimited).`);
                }
                prize.dailyStock = stock;
            }
        }
    }

    const total = next.reduce((sum, p) => sum + p.chance, 0);

    if(Math.abs(total - 100) > 0.001){
        throw new Error(`All eight chances must add up to 100%. They currently add up to ${Math.round(total * 1000) / 1000}%.`);
    }

    config.prizes = next;
}

export function restoreDefaultOdds(config){
    config.prizes = config.prizes.map(p => {
        const def = DEFAULT_PRIZES.find(d => d.designSlot === p.designSlot);
        return { ...p, chance: def.chance, active: true };
    });
}

/*
 * Everything the admin page shows, for one business day.
 */
export function buildReport(config, devices, day){

    const today = dayKey();
    const winPrizes = config.prizes.filter(p => p.type === "win");
    const nameOf = slot => (config.prizes.find(p => p.designSlot === Number(slot)) || {}).name || `Slice ${slot}`;

    const allDays = new Set([today]);
    const dayTotals = { spins: 0, wins: 0, losses: 0, outOfStockHits: 0, given: {} };
    const allTime = { spins: 0, wins: 0, losses: 0, given: {} };
    const history = [];

    const deviceRows = devices
        .map(device => {

            Object.keys(device.days).forEach(key => {
                allDays.add(key);
                const d = device.days[key];
                allTime.spins += d.spins;
                allTime.wins += d.wins;
                allTime.losses += d.losses;
                Object.entries(d.given).forEach(([slot, n]) => {
                    allTime.given[slot] = (allTime.given[slot] || 0) + n;
                });
            });

            const d = device.days[day] || emptyDay();

            dayTotals.spins += d.spins;
            dayTotals.wins += d.wins;
            dayTotals.losses += d.losses;
            dayTotals.outOfStockHits += d.outOfStockHits;

            Object.entries(d.given).forEach(([slot, n]) => {
                dayTotals.given[slot] = (dayTotals.given[slot] || 0) + n;
            });

            const label = device.name || `Device ${shortCode(device.id)}`;

            d.history.forEach(item => {
                history.push({
                    time: item.t,
                    device: label,
                    deviceId: device.id,
                    prize: nameOf(item.s),
                    type: (config.prizes.find(p => p.designSlot === item.s) || {}).type || "lose",
                    note: item.u ? `${nameOf(item.u)} out of stock / paused` : ""
                });
            });

            return {
                id: device.id,
                code: shortCode(device.id),
                name: device.name,
                label,
                blocked: device.blocked,
                createdAt: device.createdAt,
                lastSeen: device.lastSeen,
                spins: d.spins,
                wins: d.wins,
                losses: d.losses,
                prizes: winPrizes.map(p => ({
                    designSlot: p.designSlot,
                    given: d.given[p.designSlot] || 0,
                    stock: p.dailyStock,
                    left: day === today ? stockLeft(p, d) : null
                }))
            };
        })
        .sort((a, b) => String(b.lastSeen || "").localeCompare(String(a.lastSeen || "")));

    history.sort((a, b) => b.time.localeCompare(a.time));

    return {
        config,
        day,
        today,
        nextRefill: nextRefillTime(),
        refillHour: REFILL_HOUR,
        days: Array.from(allDays).sort().reverse(),
        totals: dayTotals,
        allTime,
        activeDevices: deviceRows.filter(d => d.spins > 0).length,
        devices: deviceRows,
        history: history.slice(0, 5000),
        historyTotal: history.length
    };
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
