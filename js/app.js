/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   APPLICATION CONTROLLER
========================================================== */

"use strict";

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
    initializeModule("Sounds", initializeSounds);
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

    /* The wheel is the primary visible control. */
    window.startSpinFromWheel = startSpin;
}

function startSpin(){

    if(isSpinning){
        return;
    }

    if(typeof getRandomPrize !== "function" || typeof spinWheel !== "function"){
        console.error("Spin engine is unavailable.");
        return;
    }

    const prize = getRandomPrize();

    if(!prize){
        console.warn("No enabled prizes are available.");
        return;
    }

    isSpinning = true;

    if(spinButton){
        spinButton.disabled = true;
    }

    if(typeof playClickSound === "function"){
        playClickSound();
    }

    if(typeof playSpinSound === "function"){
        playSpinSound();
    }

    spinWheel(prize, function(landedPrize){
        // The wheel engine determines the actual segment under the pointer.
        finishSpin(landedPrize || prize);
    });
}

function finishSpin(prize){

    try{

        if(typeof recordSpin === "function"){
            recordSpin(prize);
        }

        if(typeof playResultSound === "function"){
            playResultSound(prize);
        }

        if(typeof showWinnerPopup === "function"){
            showWinnerPopup(prize);
        }
    }
    finally{
        isSpinning = false;

        if(spinButton){
            spinButton.disabled = false;
        }
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
