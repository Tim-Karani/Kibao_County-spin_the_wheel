/* ==========================================================
   SPIN2WIN - KIBAO EDITION
   storage.js

   Generic LocalStorage Helper
========================================================== */

"use strict";

/* ==========================================================
   STORAGE NAMESPACE
========================================================== */

const STORAGE_PREFIX = "spin2win_";

/* ==========================================================
   BUILD STORAGE KEY
========================================================== */

function buildStorageKey(key){

    return STORAGE_PREFIX + key;

}

/* ==========================================================
   SAVE VALUE
========================================================== */

function save(key, value){

    try{

        localStorage.setItem(

            buildStorageKey(key),

            JSON.stringify(value)

        );

        return true;

    }

    catch(error){

        console.error(

            "Unable to save to LocalStorage.",

            error

        );

        return false;

    }

}

/* ==========================================================
   LOAD VALUE
========================================================== */

function load(key, defaultValue = null){

    try{

        const data = localStorage.getItem(

            buildStorageKey(key)

        );

        if(data === null){

            return defaultValue;

        }

        return JSON.parse(data);

    }

    catch(error){

        console.error(

            "Unable to load LocalStorage data.",

            error

        );

        return defaultValue;

    }

}

/* ==========================================================
   REMOVE VALUE
========================================================== */

function remove(key){

    try{

        localStorage.removeItem(

            buildStorageKey(key)

        );

        return true;

    }

    catch(error){

        console.error(

            "Unable to remove LocalStorage data.",

            error

        );

        return false;

    }

}

/* ==========================================================
   CHECK EXISTENCE
========================================================== */

function exists(key){

    return localStorage.getItem(

        buildStorageKey(key)

    ) !== null;

}

/* ==========================================================
   CLEAR SPIN2WIN STORAGE
========================================================== */

function clearStorage(){

    try{

        const keys = [];

        for(let i = 0; i < localStorage.length; i++){

            const key = localStorage.key(i);

            if(key.startsWith(STORAGE_PREFIX)){

                keys.push(key);

            }

        }

        keys.forEach(key => {

            localStorage.removeItem(key);

        });

        return true;

    }

    catch(error){

        console.error(

            "Unable to clear LocalStorage.",

            error

        );

        return false;

    }

}

/* ==========================================================
   GET ALL SPIN2WIN DATA
========================================================== */

function getAllStorage(){

    const data = {};

    for(let i = 0; i < localStorage.length; i++){

        const key = localStorage.key(i);

        if(key.startsWith(STORAGE_PREFIX)){

            try{

                data[key.replace(STORAGE_PREFIX,"")] = JSON.parse(

                    localStorage.getItem(key)

                );

            }

            catch{

                data[key.replace(STORAGE_PREFIX,"")] = localStorage.getItem(key);

            }

        }

    }

    return data;

}

/* ==========================================================
   EXPORTS
========================================================== */

window.save = save;
window.load = load;
window.remove = remove;
window.exists = exists;
window.clearStorage = clearStorage;
window.getAllStorage = getAllStorage;