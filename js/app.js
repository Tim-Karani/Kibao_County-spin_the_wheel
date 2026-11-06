/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   APPLICATION CONTROLLER

   The result of every spin is drawn on the Netlify server
   (/api/spin). Each device is one outlet with its own daily stock.
========================================================== */

"use strict";

const SPIN_ENDPOINT = "/api/spin";
const DEVICE_ENDPOINT = "/api/device";
const SPIN_TIMEOUT_MS = 10000;
const DEVICE_KEY = "kibao_device_id";

let canvas = null;
let spinButton = null;
let loadingScreen = null;
let isSpinning = false;
let deviceId = "";

document.addEventListener("DOMContentLoaded", initializeApplication);

function initializeApplication(){

    cacheDOM();
    bindEvents();
    initializeModules();
    initializeDevice();
    hideLoadingScreen();
}

function cacheDOM(){
    canvas = document.getElementById("wheelCanvas");
    spinButton = document.getElementById("spinBtn");
    loadingScreen = document.getElementById("loading-screen");
}

function initializeModules(){

    initializeModule("Popup", initializePopup);
    initializeModule("Wheel", function(){
        initializeWheel(canvas);
    });
}

function initializeModule(name, fn){

    if(typeof fn !== "function"){
        console.warn(`${name} module missing.`);
        return;
    }

    try{
        fn();
    }
    catch(error){
        console.error(`${name} failed:`, error);
    }
}

function bindEvents(){

    if(spinButton){
        spinButton.addEventListener("click", startSpin);
    }

    /* The wheel itself is also a spin control. */
    window.startSpinFromWheel = startSpin;
}

function setBusy(busy){

    isSpinning = busy;

    if(spinButton){
        spinButton.disabled = busy;
        spinButton.textContent = busy ? "Spinning…" : "Spin the wheel";
    }
}

/* ==========================================================
   DEVICE ID
   Each phone or tablet registers itself automatically the first
   time it opens the game (nothing to type). Its ID is kept in this
   browser (local storage, plus a cookie as a backup), and the server
   counts it as one outlet with its own daily stock.
========================================================== */

let registering = null;

function readDeviceId(){

    let id = "";

    try{
        id = localStorage.getItem(DEVICE_KEY) || "";
    }
    catch{
        id = "";
    }

    if(!id){
        const match = document.cookie.match(/(?:^|;\s*)kibao_device=([^;]+)/);
        id = match ? decodeURIComponent(match[1]) : "";
    }

    return /^d_[a-f0-9]{24}$/.test(id) ? id : "";
}

function storeDeviceId(id){

    try{
        localStorage.setItem(DEVICE_KEY, id);
    }
    catch{
        /* Cookie below still keeps it. */
    }

    const maxAge = 60 * 60 * 24 * 400;
    document.cookie = `kibao_device=${encodeURIComponent(id)}; max-age=${maxAge}; path=/; SameSite=Lax; Secure`;
}

function forgetDeviceId(){

    try{
        localStorage.removeItem(DEVICE_KEY);
    }
    catch{
        /* ignore */
    }

    document.cookie = "kibao_device=; max-age=0; path=/; SameSite=Lax; Secure";
    deviceId = "";
}

/* Returns this device's ID, registering it silently if needed. */
function ensureDevice(){

    if(deviceId){
        return Promise.resolve(deviceId);
    }

    if(!registering){
        registering = postJson(DEVICE_ENDPOINT, { action: "register" })
            .then(function(data){
                if(!data.deviceId){
                    throw new Error(data.error || "Could not register this device.");
                }
                deviceId = data.deviceId;
                storeDeviceId(deviceId);
                return deviceId;
            })
            .finally(function(){
                registering = null;
            });
    }

    return registering;
}

function initializeDevice(){

    deviceId = readDeviceId();

    if(!deviceId){
        // Register in the background so the first spin is instant.
        ensureDevice().catch(function(){});
        return;
    }

    // Confirm the device is still known and enabled. If the network is
    // down, carry on: the spin request will check again.
    postJson(DEVICE_ENDPOINT, { action: "check", deviceId: deviceId })
        .then(function(data){
            if(data.status === "setup"){
                forgetDeviceId();
                ensureDevice().catch(function(){});
            }
            else if(data.status === "blocked"){
                showBlockedScreen();
            }
        })
        .catch(function(){});
}

function showBlockedScreen(){

    const screen = document.getElementById("blockedScreen");

    if(screen){
        screen.classList.remove("hidden");
    }
}

async function postJson(url, body){

    const controller = new AbortController();
    const timer = setTimeout(function(){ controller.abort(); }, SPIN_TIMEOUT_MS);

    try{
        const response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
            signal: controller.signal
        });

        const data = await response.json().catch(function(){ return {}; });

        if(!response.ok && !data.code){
            throw new Error(data.error || `Server error (${response.status}).`);
        }

        return data;
    }
    catch(error){
        if(error.name === "AbortError" || error instanceof TypeError){
            throw new Error("Connection problem. Check the internet and try again.");
        }
        throw error;
    }
    finally{
        clearTimeout(timer);
    }
}

async function requestSpin(){

    const controller = new AbortController();
    const timer = setTimeout(function(){ controller.abort(); }, SPIN_TIMEOUT_MS);

    try{
        const response = await fetch(SPIN_ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ deviceId: deviceId }),
            cache: "no-store",
            signal: controller.signal
        });

        const data = await response.json().catch(function(){ return {}; });

        if(!response.ok || !data.result){
            const error = new Error(data.error || "Spin failed.");
            error.code = data.code || "";
            throw error;
        }

        return data.result;
    }
    finally{
        clearTimeout(timer);
    }
}

async function startSpin(){

    if(isSpinning || (typeof isWheelSpinning === "function" && isWheelSpinning())){
        return;
    }


    setBusy(true);

    if(typeof playClickSound === "function"){
        playClickSound();
    }

    let result = null;

    try{
        await ensureDevice();

        try{
            result = await requestSpin();
        }
        catch(error){
            // Device record missing on the server: register again, retry once.
            if(error.code !== "setup"){
                throw error;
            }
            forgetDeviceId();
            await ensureDevice();
            result = await requestSpin();
        }
    }
    catch(error){
        console.error("Spin request failed:", error);
        setBusy(false);

        if(error.code === "blocked"){
            showBlockedScreen();
            return;
        }

        if(typeof showConnectionError === "function"){
            showConnectionError();
        }
        return;
    }

    if(typeof playSpinSound === "function"){
        playSpinSound();
    }

    const started = spinWheel(result.designSlot, function(landed){
        finishSpin(landed || result);
    });

    if(!started){
        setBusy(false);
    }
}

function finishSpin(prize){

    try{
        if(typeof playResultSound === "function"){
            playResultSound(prize);
        }

        if(typeof showWinnerPopup === "function"){
            showWinnerPopup(prize);
        }
    }
    finally{
        setBusy(false);
    }
}

function hideLoadingScreen(){

    if(!loadingScreen){
        return;
    }

    setTimeout(function(){
        loadingScreen.style.opacity = "0";
        loadingScreen.style.pointerEvents = "none";

        setTimeout(function(){
            loadingScreen.style.display = "none";
        }, 350);
    }, 250);
}

window.addEventListener("error", function(event){
    console.error(
        "Application Error:",
        event.message,
        "File:", event.filename,
        "Line:", event.lineno
    );
});
