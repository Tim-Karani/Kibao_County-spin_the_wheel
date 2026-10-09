/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   Minimal result popup
========================================================== */

"use strict";

let popupOverlay = null;
let popupMessage = null;
let closeButton = null;

function initializePopup(){

    popupOverlay = document.getElementById("winnerPopup");
    popupMessage = document.getElementById("popupMessage");
    closeButton = document.getElementById("closePopup");

    if(!popupOverlay){
        console.warn("Winner popup not found.");
        return;
    }

    popupOverlay.classList.add("hidden");

    if(closeButton){
        closeButton.addEventListener("click", hideWinnerPopup);
    }

    popupOverlay.addEventListener("click", function(event){
        if(event.target === popupOverlay){
            hideWinnerPopup();
        }
    });
}

function showWinnerPopup(prize){

    if(!popupOverlay || !prize || !popupMessage || !closeButton){
        return;
    }

    if(prize.type === "win"){
        popupMessage.textContent =
            `Congratulations!`;
        closeButton.textContent = "CONGRATULATIONS";
        popupOverlay.classList.remove("result-loss");
        popupOverlay.classList.add("result-win");
    }
    else{
        popupMessage.textContent =
            "Oops! Try again next time.";
        closeButton.textContent = "OOPS";
        popupOverlay.classList.remove("result-win");
        popupOverlay.classList.add("result-loss");
    }

    popupOverlay.classList.remove("hidden");
    popupOverlay.classList.add("show");
}

function hideWinnerPopup(){
    if(!popupOverlay){
        return;
    }

    popupOverlay.classList.remove("show");
    popupOverlay.classList.add("hidden");
}

window.initializePopup = initializePopup;
window.showWinnerPopup = showWinnerPopup;
window.hideWinnerPopup = hideWinnerPopup;
