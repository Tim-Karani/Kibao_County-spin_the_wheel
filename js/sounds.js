/* ==========================================================
   SPIN2WIN - COUNTY KIBAO
   sounds.js

   Uses the Web Audio API so the rapid pointer ticks play
   cleanly on phones and tablets. Falls back to plain <audio>
   on very old browsers. Sound starts after the first tap
   (browsers block audio before the user interacts).
   To change a sound, replace the matching file in
   assets/sounds/ and keep the same file name.
========================================================== */

"use strict";

const SOUND_FILES = {
    spin:  { src: "assets/sounds/spin.mp3",  volume: 0.55 },
    tick:  { src: "assets/sounds/tick.mp3",  volume: 0.35 },
    win:   { src: "assets/sounds/win.mp3",   volume: 0.9  },
    lose:  { src: "assets/sounds/lose.mp3",  volume: 0.75 },
    click: { src: "assets/sounds/click.mp3", volume: 0.5  }
};

const SOUND_PREF_KEY = "spin2win_sound_muted";
const TICK_MIN_GAP = 0.035; // seconds; avoids a buzz when the wheel is fastest

let audioContext = null;
let buffers = {};
let fallbackAudio = {};
let soundEnabled = true;
let soundsInitialized = false;
let lastTickAt = 0;

function readMutedPreference(){
    try{
        return localStorage.getItem(SOUND_PREF_KEY) === "1";
    }
    catch{
        return false;
    }
}

function writeMutedPreference(muted){
    try{
        localStorage.setItem(SOUND_PREF_KEY, muted ? "1" : "0");
    }
    catch{
        /* Private mode or storage blocked: preference just isn't remembered. */
    }
}

function initializeSounds(){

    if(soundsInitialized){
        return;
    }

    soundsInitialized = true;
    soundEnabled = !readMutedPreference();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    if(AudioCtx){
        try{
            audioContext = new AudioCtx();
            loadBuffers();
        }
        catch(error){
            audioContext = null;
        }
    }

    if(!audioContext){
        loadFallbackAudio();
    }

    // Browsers only allow audio after a user gesture.
    ["pointerdown", "touchstart", "keydown"].forEach(function(type){
        document.addEventListener(type, unlockAudio, { passive: true });
    });

    bindSoundToggle();
}

function loadBuffers(){

    Object.keys(SOUND_FILES).forEach(function(name){

        fetch(SOUND_FILES[name].src)
            .then(function(response){
                if(!response.ok){
                    throw new Error("HTTP " + response.status);
                }
                return response.arrayBuffer();
            })
            .then(function(data){
                return new Promise(function(resolve, reject){
                    // Callback form works on older Safari too.
                    audioContext.decodeAudioData(data, resolve, reject);
                });
            })
            .then(function(buffer){
                buffers[name] = buffer;
            })
            .catch(function(error){
                console.warn("Could not load sound:", name, error);
            });
    });
}

function loadFallbackAudio(){

    Object.keys(SOUND_FILES).forEach(function(name){
        const audio = new Audio(SOUND_FILES[name].src);
        audio.preload = "auto";
        audio.volume = SOUND_FILES[name].volume;
        fallbackAudio[name] = audio;
    });
}

function unlockAudio(){
    if(audioContext && audioContext.state === "suspended"){
        audioContext.resume().catch(function(){});
    }
}

function play(name){

    if(!soundEnabled){
        return;
    }

    if(audioContext){

        const buffer = buffers[name];

        if(!buffer){
            return;
        }

        if(audioContext.state === "suspended"){
            audioContext.resume().catch(function(){});
        }

        try{
            const source = audioContext.createBufferSource();
            const gain = audioContext.createGain();
            gain.gain.value = SOUND_FILES[name].volume;
            source.buffer = buffer;
            source.connect(gain).connect(audioContext.destination);
            source.start();
        }
        catch(error){
            console.warn("Unable to play sound.", error);
        }
        return;
    }

    const audio = fallbackAudio[name];

    if(!audio){
        return;
    }

    try{
        audio.currentTime = 0;
        const result = audio.play();
        if(result && typeof result.catch === "function"){
            result.catch(function(){});
        }
    }
    catch(error){
        console.warn("Unable to play sound.", error);
    }
}

function playSpinSound(){
    play("spin");
}

function playTickSound(){

    const now = audioContext ? audioContext.currentTime : performance.now() / 1000;

    if(now - lastTickAt < TICK_MIN_GAP){
        return;
    }

    lastTickAt = now;
    play("tick");
}

function playWinSound(){
    play("win");
}

function playLoseSound(){
    play("lose");
}

function playClickSound(){
    play("click");
}

function playResultSound(prize){

    if(!prize){
        return;
    }

    if(prize.type === "win"){
        playWinSound();
    }
    else{
        playLoseSound();
    }
}

/* ---------------- Mute button ---------------- */

function bindSoundToggle(){

    const button = document.getElementById("soundToggle");

    if(!button){
        return;
    }

    updateToggleButton(button);

    button.addEventListener("click", function(event){
        event.stopPropagation();
        toggleSound();
        updateToggleButton(button);
    });
}

function updateToggleButton(button){
    button.setAttribute("aria-pressed", soundEnabled ? "false" : "true");
    button.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Turn sound on");
}

function enableSound(){
    soundEnabled = true;
    writeMutedPreference(false);
}

function disableSound(){
    soundEnabled = false;
    writeMutedPreference(true);
}

function toggleSound(){

    if(soundEnabled){
        disableSound();
    }
    else{
        enableSound();
        unlockAudio();
    }

    return soundEnabled;
}

function isSoundEnabled(){
    return soundEnabled;
}

document.addEventListener("DOMContentLoaded", initializeSounds);

window.initializeSounds = initializeSounds;
window.playSpinSound = playSpinSound;
window.playTickSound = playTickSound;
window.playWinSound = playWinSound;
window.playLoseSound = playLoseSound;
window.playClickSound = playClickSound;
window.playResultSound = playResultSound;
window.enableSound = enableSound;
window.disableSound = disableSound;
window.toggleSound = toggleSound;
window.isSoundEnabled = isSoundEnabled;
