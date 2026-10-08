/* ==========================================================
   SPIN2WIN - KIBAO EDITION
   REFERENCE-ACCURATE WHEEL ENGINE

   The visual wheel is built from the supplied Kibao artwork
   (page 2 of the provided design PDF) so the game wheel keeps
   the exact colours, typography, artwork and centre treatment.
========================================================== */

"use strict";

let wheelCanvas = null;
let ctx = null;
let wheelSize = 500;
let pixelRatio = 1;
let centerX = 250;
let centerY = 250;
let wheelRotation = 0;
let spinning = false;
let animationFrame = null;
let wheelImage = null;
let prizes = [];
let sliceAngle = Math.PI / 4;
let imageReady = false;
let previousTick = -1;

const WHEEL_IMAGE = "assets/images/wheel-reference.png";
const SPIN_DURATION = 2200;
const EXTRA_ROTATIONS = 4;
const POINTER_ANGLE = -Math.PI / 2;

/*
 * Fixed visual slots in the supplied artwork, clockwise from
 * the upper-left yellow slice.
 */
const DESIGN_SLOTS = [
    { id: 1, angle: -3 * Math.PI / 8 },   // Bucket Hat
    { id: 2, angle: -Math.PI / 8 },       // Try Again (maroon)
    { id: 3, angle:  Math.PI / 8 },        // T-Shirt
    { id: 4, angle:  3 * Math.PI / 8 },    // Try Again (yellow)
    { id: 5, angle:  5 * Math.PI / 8 },    // Wristband
    { id: 6, angle:  7 * Math.PI / 8 },    // Try Again (maroon)
    { id: 7, angle:  9 * Math.PI / 8 },    // Tumbler
    { id: 8, angle: 11 * Math.PI / 8 }    // Try Again (yellow)
];

function initializeWheel(canvas){

    wheelCanvas = canvas;

    if(!wheelCanvas){
        return;
    }

    ctx = wheelCanvas.getContext("2d");

    if(!ctx){
        return;
    }

    loadWheelImage();
    resizeWheel();

    window.addEventListener("resize", resizeWheel);

    wheelCanvas.addEventListener("click", function(){
        if(!spinning && typeof window.startSpinFromWheel === "function"){
            window.startSpinFromWheel();
        }
    });
}

function loadWheelImage(){

    wheelImage = new Image();
    wheelImage.decoding = "async";
    wheelImage.onload = function(){
        imageReady = true;
        redrawWheel();
    };
    wheelImage.onerror = function(){
        console.error("Unable to load Kibao wheel reference artwork.");
    };
    wheelImage.src = WHEEL_IMAGE;
}

function refreshWheelData(){

    if(typeof getEnabledPrizes !== "function"){
        prizes = [];
        return;
    }

    prizes = getEnabledPrizes();
    sliceAngle = Math.PI / 4;
}

function resizeWheel(){

    if(!wheelCanvas || !ctx){
        return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Reserve room for the visible SPIN THE WHEEL button beneath the artwork.
    const availableHeight = Math.max(320, viewportHeight - 105);
    const maxSize = Math.min(viewportWidth, availableHeight) * 0.94;
    wheelSize = Math.max(260, Math.floor(Math.min(maxSize, 980)));

    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    wheelCanvas.width = Math.round(wheelSize * pixelRatio);
    wheelCanvas.height = Math.round(wheelSize * pixelRatio);
    wheelCanvas.style.width = wheelSize + "px";
    wheelCanvas.style.height = wheelSize + "px";

    centerX = wheelSize / 2;
    centerY = wheelSize / 2;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    redrawWheel();
}

function redrawWheel(){

    if(!ctx){
        return;
    }

    refreshWheelData();

    ctx.clearRect(0, 0, wheelSize, wheelSize);

    if(!imageReady || !wheelImage){
        drawLoadingWheel();
        return;
    }

    const radius = wheelSize * 0.498;

    ctx.save();

    /* Keep the reference artwork perfectly circular. */
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(centerX, centerY);
    ctx.rotate(wheelRotation);

    ctx.drawImage(
        wheelImage,
        -radius,
        -radius,
        radius * 2,
        radius * 2
    );

    ctx.restore();

    /* Crisp black edge matching the supplied artwork. */
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(3, wheelSize * 0.008);
    ctx.strokeStyle = "#000000";
    ctx.stroke();
}

function drawLoadingWheel(){

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, wheelSize * 0.49, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
}

function normalizeAngle(angle){

    const full = Math.PI * 2;
    angle %= full;

    if(angle < 0){
        angle += full;
    }

    return angle;
}

function stopAnimation(){

    if(animationFrame){
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

function easeOutQuint(t){
    return 1 - Math.pow(1 - t, 5);
}

function getPrizeIndex(prize){

    if(!prize){
        return -1;
    }

    return prizes.findIndex(function(item){
        return item.id === prize.id;
    });
}

function getDesignSlotForPrize(prize){

    if(!prize){
        return 0;
    }

    const slot = Number(prize.designSlot);

    if(Number.isInteger(slot) && slot >= 1 && slot <= 8){
        return slot - 1;
    }

    const index = getPrizeIndex(prize);
    return index >= 0 ? index % 8 : 0;
}

function calculateTargetRotation(prize){

    const slotIndex = getDesignSlotForPrize(prize);
    const localCenter = DESIGN_SLOTS[slotIndex].angle;

    let target = POINTER_ANGLE - localCenter;

    while(target <= wheelRotation){
        target += Math.PI * 2;
    }

    target += EXTRA_ROTATIONS * Math.PI * 2;

    return target;
}

function handlePointerTick(){

    if(typeof playTickSound !== "function"){
        return;
    }

    const currentTick = Math.floor(
        normalizeAngle(-wheelRotation + Math.PI / 2) / sliceAngle
    );

    if(currentTick !== previousTick){
        previousTick = currentTick;
        playTickSound();
    }
}

function animateWheel(targetRotation, callback){

    stopAnimation();

    spinning = true;
    previousTick = -1;

    const startRotation = wheelRotation;
    const distance = targetRotation - startRotation;
    const startTime = performance.now();

    function frame(now){

        const progress = Math.min(
            (now - startTime) / SPIN_DURATION,
            1
        );

        wheelRotation = startRotation + distance * easeOutQuint(progress);

        handlePointerTick();
        redrawWheel();

        if(progress < 1){
            animationFrame = requestAnimationFrame(frame);
            return;
        }

        wheelRotation = normalizeAngle(wheelRotation);
        spinning = false;
        animationFrame = null;
        redrawWheel();

        if(typeof callback === "function"){
            callback();
        }
    }

    animationFrame = requestAnimationFrame(frame);
}

function spinWheel(prize, callback){

    if(spinning || !prize){
        return false;
    }

    refreshWheelData();

    const targetRotation = calculateTargetRotation(prize);

    animateWheel(targetRotation, function(){

        // Never trust the pre-selected prize for the result message.
        // Read the segment physically under the pointer after the wheel stops.
        const landedPrize = getCurrentPrize();

        if(typeof callback === "function"){
            callback(landedPrize || prize);
        }
    });

    return true;
}

function getCurrentSliceIndex(){

    const pointerLocalAngle = normalizeAngle(POINTER_ANGLE - wheelRotation);

    let nearestIndex = 0;
    let nearestDistance = Infinity;

    DESIGN_SLOTS.forEach(function(slot, index){
        const slotAngle = normalizeAngle(slot.angle);
        let distance = Math.abs(pointerLocalAngle - slotAngle);
        distance = Math.min(distance, Math.PI * 2 - distance);

        if(distance < nearestDistance){
            nearestDistance = distance;
            nearestIndex = index;
        }
    });

    return nearestIndex;
}

function getCurrentPrize(){

    const slotIndex = getCurrentSliceIndex();
    const slotId = DESIGN_SLOTS[slotIndex].id;

    return prizes.find(function(prize){
        return Number(prize.designSlot) === Number(slotId);
    }) || null;
}

function reloadWheel(){
    refreshWheelData();
    redrawWheel();
}

function refreshWheel(){
    reloadWheel();
}

function resetWheel(){
    stopAnimation();
    spinning = false;
    wheelRotation = 0;
    redrawWheel();
}

function destroyWheel(){
    stopAnimation();
    spinning = false;
    wheelRotation = 0;
    prizes = [];
    wheelImage = null;
    imageReady = false;
    wheelCanvas = null;
    ctx = null;
}

function isWheelSpinning(){
    return spinning;
}

function getWheelPrizes(){
    return prizes;
}

function getWheelRotation(){
    return wheelRotation;
}

function getWheelRadius(){
    return wheelSize * 0.498;
}

function getWheelSize(){
    return wheelSize;
}

window.initializeWheel = initializeWheel;
window.spinWheel = spinWheel;
window.reloadWheel = reloadWheel;
window.refreshWheel = refreshWheel;
window.resetWheel = resetWheel;
window.destroyWheel = destroyWheel;
window.redrawWheel = redrawWheel;
window.getWheelPrizes = getWheelPrizes;
window.getWheelRotation = getWheelRotation;
window.getWheelRadius = getWheelRadius;
window.getWheelSize = getWheelSize;
window.isWheelSpinning = isWheelSpinning;
