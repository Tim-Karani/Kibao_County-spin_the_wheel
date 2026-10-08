/* ==========================================================
   SPIN2WIN - KIBAO EDITION
   analytics.js

   Version 1
   LocalStorage Analytics
========================================================== */

"use strict";

/* ==========================================================
   STORAGE KEY
========================================================== */

const ANALYTICS_KEY = "analytics";

/* ==========================================================
   DEFAULT ANALYTICS
========================================================== */

function defaultAnalytics(){

    return{

        totalSpins:0,

        totalWins:0,

        totalLosses:0,

        totalRetries:0,

        prizeCounts:{},

        history:[]

    };

}

/* ==========================================================
   LOAD ANALYTICS
========================================================== */

function getAnalytics(){

    return load(

        ANALYTICS_KEY,

        defaultAnalytics()

    );

}

/* ==========================================================
   SAVE ANALYTICS
========================================================== */

function saveAnalytics(data){

    save(

        ANALYTICS_KEY,

        data

    );

}

/* ==========================================================
   RECORD SPIN
========================================================== */

function recordSpin(prize){

    if(!prize){

        return;

    }

    const analytics = getAnalytics();

    analytics.totalSpins++;

    switch(prize.type){

        case "win":

            analytics.totalWins++;

            break;

        case "lose":

            analytics.totalLosses++;

            break;

        case "retry":

            analytics.totalRetries++;

            break;

    }

    if(!analytics.prizeCounts[prize.name]){

        analytics.prizeCounts[prize.name] = 0;

    }

    analytics.prizeCounts[prize.name]++;

    analytics.history.unshift({

        id:Date.now(),

        prizeId:prize.id,

        prize:prize.name,

        type:prize.type,

        timestamp:new Date().toISOString()

    });

    /*
    ---------------------------------------
    Keep latest 1000 spins
    ---------------------------------------
    */

    if(analytics.history.length > 1000){

        analytics.history.length = 1000;

    }

    saveAnalytics(

        analytics

    );

}

/* ==========================================================
   SUMMARY
========================================================== */

function getAnalyticsSummary(){

    const analytics = getAnalytics();

    return{

        totalSpins:analytics.totalSpins,

        totalWins:analytics.totalWins,

        totalLosses:analytics.totalLosses,

        totalRetries:analytics.totalRetries,

        prizes:Object.keys(

            analytics.prizeCounts

        ).length

    };

}

/* ==========================================================
   HISTORY
========================================================== */

function getSpinHistory(){

    return getAnalytics().history;

}

/* ==========================================================
   PRIZE COUNTS
========================================================== */

function getPrizeCounts(){

    return getAnalytics().prizeCounts;

}

/* ==========================================================
   EXPORT JSON
========================================================== */

function exportAnalytics(){

    const data = JSON.stringify(

        getAnalytics(),

        null,

        4

    );

    const blob = new Blob(

        [data],

        {

            type:"application/json"

        }

    );

    const url = URL.createObjectURL(

        blob

    );

    const link = document.createElement(

        "a"

    );

    const date = new Date()

        .toISOString()

        .slice(0,19)

        .replace(/:/g,"-");

    link.href = url;

    link.download =

        `spin2win_analytics_${date}.json`;

    document.body.appendChild(

        link

    );

    link.click();

    document.body.removeChild(

        link

    );

    URL.revokeObjectURL(

        url

    );

}

/* ==========================================================
   RESET ANALYTICS
========================================================== */

function resetAnalytics(){

    saveAnalytics(

        defaultAnalytics()

    );

}

/* ==========================================================
   EXPORTS
========================================================== */

window.recordSpin = recordSpin;

window.getAnalytics = getAnalytics;

window.getAnalyticsSummary = getAnalyticsSummary;

window.getSpinHistory = getSpinHistory;

window.getPrizeCounts = getPrizeCounts;

window.exportAnalytics = exportAnalytics;

window.resetAnalytics = resetAnalytics;