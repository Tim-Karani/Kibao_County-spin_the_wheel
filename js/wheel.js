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
let sliceAngle = Math.PI / 4;
let imageReady = false;
let previousTick = -1;

const WHEEL_IMAGE = "assets/images/wheel-reference.png";
const SPIN_DURATION = 2200;
const EXTRA_ROTATIONS = 4;
const POINTER_ANGLE = -Math.PI / 2;

/*
 * Fixed slices of the artwork, clockwise from the slice just
 * right of the pointer. This table is the single source of truth
 * for what each slice shows; admin settings cannot change it, so
 * the result always matches the picture under the pointer.
 */
const DESIGN_SLOTS = [
    { id: 1, angle: -3 * Math.PI / 8, name: "Bucket Hat",          type: "win"  },
    { id: 2, angle:     -Math.PI / 8, name: "Try Again Next Time", type: "lose" },
    { id: 3, angle:      Math.PI / 8, name: "T-Shirt",             type: "win"  },
    { id: 4, angle:  3 * Math.PI / 8, name: "Try Again Next Time", type: "lose" },
    { id: 5, angle:  5 * Math.PI / 8, name: "Wristband",           type: "win"  },
    { id: 6, angle:  7 * Math.PI / 8, name: "Try Again Next Time", type: "lose" },
    { id: 7, angle:  9 * Math.PI / 8, name: "Tumbler",             type: "win"  },
    { id: 8, angle: 11 * Math.PI / 8, name: "Try Again Next Time", type: "lose" }
];

/* Stop somewhere inside the slice, never closer than ~30% of a
   half-slice to its edge, so landings look natural. */
const LANDING_SPREAD = (Math.PI / 8) * 0.7;

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

function getSlotIndex(designSlot){

    const index = DESIGN_SLOTS.findIndex(function(slot){
        return slot.id === Number(designSlot);
    });

    return index;
}

function calculateTargetRotation(designSlot){

    const slotIndex = getSlotIndex(designSlot);
    const offset = (Math.random() * 2 - 1) * LANDING_SPREAD;
    const localCenter = DESIGN_SLOTS[slotIndex].angle + offset;

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

/*
 * Spin to the slice chosen by the server (designSlot 1-8).
 * When the wheel stops, the result is read from the slice that is
 * physically under the pointer and passed to the callback.
 */
function spinWheel(designSlot, callback){

    if(spinning || getSlotIndex(designSlot) < 0){
        return false;
    }

    const targetRotation = calculateTargetRotation(designSlot);

    animateWheel(targetRotation, function(){

        if(typeof callback === "function"){
            callback(getCurrentPrize());
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

    const slot = DESIGN_SLOTS[getCurrentSliceIndex()];

    return {
        designSlot: slot.id,
        name: slot.name,
        type: slot.type
    };
}

function reloadWheel(){
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
    wheelImage = null;
    imageReady = false;
    wheelCanvas = null;
    ctx = null;
}

function isWheelSpinning(){
    return spinning;
}

function getWheelPrizes(){
    return DESIGN_SLOTS.map(function(slot){
        return { designSlot: slot.id, name: slot.name, type: slot.type };
    });
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
window.getCurrentPrize = getCurrentPrize;
window.getWheelRotation = getWheelRotation;
window.getWheelRadius = getWheelRadius;
window.getWheelSize = getWheelSize;
window.isWheelSpinning = isWheelSpinning;
