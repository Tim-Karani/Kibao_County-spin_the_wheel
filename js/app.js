/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   APPLICATION CONTROLLER

   The result of every spin is drawn on the Netlify server
   (/api/spin), so all devices share the same odds and stock.
========================================================== */

"use strict";

const SPIN_ENDPOINT = "/api/spin";
const SPIN_TIMEOUT_MS = 10000;

let canvas = null;
let spinButton = null;
let loadingScreen = null;
let isSpinning = false;

document.addEventListener("DOMContentLoaded", initializeApplication);

function initializeApplication(){

    cacheDOM();
    bindEvents();
    initializeModules();
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

async function requestSpin(){

    const controller = new AbortController();
    const timer = setTimeout(function(){ controller.abort(); }, SPIN_TIMEOUT_MS);

    try{
        const response = await fetch(SPIN_ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
            cache: "no-store",
            signal: controller.signal
        });

        const data = await response.json().catch(function(){ return {}; });

        if(!response.ok || !data.result){
            throw new Error(data.error || "Spin failed.");
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
        result = await requestSpin();
    }
    catch(error){
        console.error("Spin request failed:", error);
        setBusy(false);

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
