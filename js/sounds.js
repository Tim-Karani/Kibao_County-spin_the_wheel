/* ==========================================================
   SPIN2WIN - KIBAO EDITION
   sounds.js

   Audio Controller
========================================================== */

"use strict";

/* ==========================================================
   SOUND SETTINGS
========================================================== */

const SOUND_STORAGE_KEY = "sound_enabled";

let soundEnabled = true;

const sounds = {

    spin: null,

    tick: null,

    win: null,

    lose: null,

    click: null

};

/* ==========================================================
   INITIALIZE
========================================================== */

function initializeSounds(){

    const saved = load(

        SOUND_STORAGE_KEY,

        true

    );

    soundEnabled = saved;

    loadAudioFiles();

}

/* ==========================================================
   LOAD AUDIO
========================================================== */

function loadAudioFiles(){

    sounds.spin = createAudio(

        "assets/sounds/spin.mp3",

        0.6

    );

    sounds.tick = createAudio(

        "assets/sounds/tick.mp3",

        0.4

    );

    sounds.win = createAudio(

        "assets/sounds/win.mp3",

        0.8

    );

    sounds.lose = createAudio(

        "assets/sounds/lose.mp3",

        0.8

    );

    sounds.click = createAudio(

        "assets/sounds/click.mp3",

        0.5

    );

}

/* ==========================================================
   CREATE AUDIO
========================================================== */

function createAudio(path,volume){

    const audio = new Audio(path);

    audio.preload = "auto";

    audio.volume = volume;

    return audio;

}

/* ==========================================================
   GENERIC PLAY
========================================================== */

function play(audio){

    if(!soundEnabled){

        return;

    }

    if(!audio){

        return;

    }

    try{

        audio.pause();

        audio.currentTime = 0;

        audio.play();

    }

    catch(error){

        console.warn(

            "Unable to play sound.",

            error

        );

    }

}

/* ==========================================================
   STOP
========================================================== */

function stop(audio){

    if(!audio){

        return;

    }

    audio.pause();

    audio.currentTime = 0;

}

/* ==========================================================
   SPIN SOUND
========================================================== */

function playSpinSound(){

    play(

        sounds.spin

    );

}

/* ==========================================================
   POINTER TICK
========================================================== */

function playTickSound(){

    play(

        sounds.tick

    );

}

/* ==========================================================
   WIN RESULT
========================================================== */

function playWinSound(){

    play(

        sounds.win

    );

}

/* ==========================================================
   LOSE RESULT
========================================================== */

function playLoseSound(){

    play(

        sounds.lose

    );

}

/* ==========================================================
   BUTTON CLICK
========================================================== */

function playClickSound(){

    play(

        sounds.click

    );

}

/* ==========================================================
   RESULT SOUND
========================================================== */

function playResultSound(prize){

    if(!prize){

        return;

    }

    switch(prize.type){

        case "win":

            playWinSound();

            break;

        case "lose":

            playLoseSound();

            break;

        case "retry":

            playLoseSound();

            break;

    }

}

/* ==========================================================
   ENABLE
========================================================== */

function enableSound(){

    soundEnabled = true;

    save(

        SOUND_STORAGE_KEY,

        true

    );

}

/* ==========================================================
   DISABLE
========================================================== */

function disableSound(){

    soundEnabled = false;

    save(

        SOUND_STORAGE_KEY,

        false

    );

}

/* ==========================================================
   TOGGLE
========================================================== */

function toggleSound(){

    soundEnabled = !soundEnabled;

    save(

        SOUND_STORAGE_KEY,

        soundEnabled

    );

    return soundEnabled;

}

/* ==========================================================
   STATUS
========================================================== */

function isSoundEnabled(){

    return soundEnabled;

}

/* ==========================================================
   AUTO INIT
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    initializeSounds

);

/* ==========================================================
   EXPORTS
========================================================== */

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