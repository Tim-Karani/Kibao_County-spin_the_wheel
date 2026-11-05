/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   APPLICATION CONTROLLER

   The result of every spin is drawn on the Netlify server
   (/api/spin), so all devices share the same odds and stock.
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
    }
}

/* ==========================================================
   DEVICE SETUP
   Each tablet registers once with the setup code. Its ID is kept
   in this browser (local storage, plus a cookie as a backup), and
   the server counts it as one outlet with its own daily stock.
========================================================== */

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

function initializeDevice(){

    const form = document.getElementById("setupForm");

    if(form){
        form.addEventListener("submit", onSetupSubmit);
    }

    deviceId = readDeviceId();

    if(!deviceId){
        showSetupScreen();
        return;
    }

    // Confirm the device is still known and enabled. If the network is
    // down, carry on: the spin request will check again.
    postJson(DEVICE_ENDPOINT, { action: "check", deviceId: deviceId })
        .then(function(data){
            if(data.status === "setup"){
                forgetDeviceId();
                showSetupScreen();
            }
            else if(data.status === "blocked"){
                showBlockedScreen();
            }
        })
        .catch(function(){});
}

function showSetupScreen(){

    const screen = document.getElementById("setupScreen");
    const card = document.getElementById("setupForm");

    if(!screen){
        return;
    }

    card.classList.remove("blocked");
    document.getElementById("setupTitle").textContent = "Set up this device";
    document.getElementById("setupText").textContent =
        "Enter the setup code from your team leader. You only need to do this once on this tablet.";
    document.getElementById("setupError").textContent = "";
    screen.classList.remove("hidden");

    setTimeout(function(){
        const input = document.getElementById("setupCode");
        if(input){
            input.focus();
        }
    }, 300);
}

function showBlockedScreen(){

    const screen = document.getElementById("setupScreen");

    if(!screen){
        return;
    }

    document.getElementById("setupForm").classList.add("blocked");
    document.getElementById("setupTitle").textContent = "This device is disabled";
    document.getElementById("setupText").textContent =
        "This tablet has been switched off by the admin. Please contact your team leader.";
    document.getElementById("setupError").textContent = "";
    screen.classList.remove("hidden");
}

async function onSetupSubmit(event){

    event.preventDefault();

    const button = document.getElementById("setupBtn");
    const error = document.getElementById("setupError");
    const code = document.getElementById("setupCode").value;
    const name = document.getElementById("setupName").value;

    if(!code.trim()){
        return;
    }

    button.disabled = true;
    error.textContent = "";

    try{
        const data = await postJson(DEVICE_ENDPOINT, { action: "register", code: code, name: name });

        if(!data.deviceId){
            throw new Error(data.error || "Could not set up this device.");
        }

        deviceId = data.deviceId;
        storeDeviceId(deviceId);
        document.getElementById("setupScreen").classList.add("hidden");
        document.getElementById("setupCode").value = "";
    }
    catch(err){
        error.textContent = err.message || "Could not set up this device. Check the internet and try again.";
    }
    finally{
        button.disabled = false;
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

    if(!deviceId){
        showSetupScreen();
        return;
    }

    setBusy(true);

    if(typeof playClickSound === "function"){
        playClickSound();
    }

    let result = null;

    try{
        result = await requestSpin();
    }
    catch(error){
        console.error("Spin request failed:", error);
        setBusy(false);

        if(error.code === "setup"){
            forgetDeviceId();
            showSetupScreen();
            return;
        }

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
