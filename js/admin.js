/* ==========================================================
   SPIN2WIN - KIBAO EDITION
   admin.js

   PART 1
   INITIALIZATION
   DASHBOARD
========================================================== */

"use strict";

/* ==========================================================
   DOM
========================================================== */

let totalSpinsElement = null;

let totalWinsElement = null;

let totalLossesElement = null;

let totalRetriesElement = null;

let refreshButton = null;

/* ==========================================================
   START
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    initializeAdmin

);

/* ==========================================================
   INITIALIZE
========================================================== */

function initializeAdmin(){

    console.log(

        "Starting Spin2Win Admin..."

    );

    cacheDOM();

    bindEvents();

    loadDashboard();

}

/* ==========================================================
   CACHE DOM
========================================================== */

function cacheDOM(){

    totalSpinsElement =

        document.getElementById(

            "totalSpins"

        );

    totalWinsElement =

        document.getElementById(

            "totalWins"

        );

    totalLossesElement =

        document.getElementById(

            "totalLosses"

        );

    totalRetriesElement =

        document.getElementById(

            "totalRetries"

        );

    refreshButton =

        document.getElementById(

            "refreshDashboard"

        );

}

/* ==========================================================
   EVENTS
========================================================== */

function bindEvents(){

    if(refreshButton){

        refreshButton.addEventListener(

            "click",

            refreshDashboard

        );

    }

}

/* ==========================================================
   LOAD DASHBOARD
========================================================== */

function loadDashboard(){

    if(typeof getAnalyticsSummary !== "function"){

        console.error(

            "analytics.js not loaded."

        );

        return;

    }

    const summary =

        getAnalyticsSummary();

    updateDashboard(

        summary

    );

}

/* ==========================================================
   UPDATE DASHBOARD
========================================================== */

function updateDashboard(summary){

    if(!summary){

        return;

    }

    totalSpinsElement.textContent =

        summary.totalSpins;

    totalWinsElement.textContent =

        summary.totalWins;

    totalLossesElement.textContent =

        summary.totalLosses;

    totalRetriesElement.textContent =

        summary.totalRetries;

}

/* ==========================================================
   REFRESH
========================================================== */

function refreshDashboard(){

    loadDashboard();

    console.log(

        "Dashboard refreshed."

    );

}

/* ==========================================================
   SIMPLE NOTIFICATION
========================================================== */

function notify(message){

    console.log(

        message

    );

}

/* ==========================================================
   EXPORTS
========================================================== */

window.refreshDashboard =

    refreshDashboard;




















/* ==========================================================
   PART 2
   PRIZE MANAGEMENT
========================================================== */

/* ==========================================================
   DOM
========================================================== */

let prizeContainer = null;

let addPrizeButton = null;

let savePrizesButton = null;

/* ==========================================================
   CACHE EXTRA DOM
========================================================== */

const previousCacheDOM = cacheDOM;

cacheDOM = function(){

    previousCacheDOM();

    prizeContainer =

        document.getElementById(

            "prizeContainer"

        );

    addPrizeButton =

        document.getElementById(

            "addPrizeBtn"

        );

    savePrizesButton =

        document.getElementById(

            "savePrizesBtn"

        );

};

/* ==========================================================
   EXTEND EVENTS
========================================================== */

const previousBindEvents = bindEvents;

bindEvents = function(){

    previousBindEvents();

    if(addPrizeButton){

        addPrizeButton.addEventListener(

            "click",

            addPrize

        );

    }

    if(savePrizesButton){

        savePrizesButton.addEventListener(

            "click",

            savePrizeConfiguration

        );

    }

};

/* ==========================================================
   EXTEND INITIALIZE
========================================================== */

const previousLoadDashboard = loadDashboard;

loadDashboard = function(){

    previousLoadDashboard();

    renderPrizeConfiguration();

};

/* ==========================================================
   RENDER PRIZES
========================================================== */

function renderPrizeConfiguration(){

    if(!prizeContainer){

        return;

    }

    prizeContainer.innerHTML = "";

    const prizes = loadPrizes();

    prizes.forEach(function(prize,index){

        prizeContainer.appendChild(

            createPrizeCard(

                prize,

                index

            )

        );

    });

}

/* ==========================================================
   CREATE CARD
========================================================== */

function createPrizeCard(prize,index){

    const card =

        document.createElement(

            "div"

        );

    card.className =

        "prize-card";

    card.innerHTML = `

        <label>

            Prize Name

        </label>

        <input

            type="text"

            class="prize-name"

            value="${prize.name}"

        >

        <label>

            Chance (%)

        </label>

        <input

            type="number"

            class="prize-chance"

            value="${prize.chance}"

            min="0"

            max="100"

        >

        <label>

            Type

        </label>

        <select

            class="prize-type"

        >

            <option value="win"

                ${prize.type==="win"?"selected":""}

            >

                Win

            </option>

            <option value="lose"

                ${prize.type==="lose"?"selected":""}

            >

                Lose

            </option>

            <option value="retry"

                ${prize.type==="retry"?"selected":""}

            >

                Retry

            </option>

        </select>

        <label>

            Slice Colour

        </label>

        <input

            type="color"

            class="prize-color"

            value="${prize.color}"

        >

        <label>

            Text Colour

        </label>

        <input

            type="color"

            class="prize-text-color"

            value="${prize.textColor}"

        >

        <label>

            Image Path

        </label>

        <input

            type="text"

            class="prize-image"

            value="${prize.image}"

        >

        <label>

            Enabled

        </label>

        <input

            type="checkbox"

            class="prize-enabled"

            ${prize.enabled ? "checked" : ""}

        >

    `;

    return card;

}

/* ==========================================================
   ADD PRIZE
========================================================== */

function addPrize(){

    const prizes =

        loadPrizes();

    prizes.push({

        id:Date.now(),

        name:"New Prize",

        chance:10,

        color:"#2196f3",

        textColor:"#ffffff",

        image:"",

        enabled:true,

        type:"win"

    });

    savePrizes(

        prizes

    );

    renderPrizeConfiguration();

}

/* ==========================================================
   SAVE PRIZES
========================================================== */

function savePrizeConfiguration(){

    const cards =

        document.querySelectorAll(

            ".prize-card"

        );

    const prizes = [];

    cards.forEach(function(card,index){

        prizes.push({

            id:Number(card.dataset.id),

            name:

                card.querySelector(

                    ".prize-name"

                ).value,

            chance:Number(

                card.querySelector(

                    ".prize-chance"

                ).value

            ),

            type:

                card.querySelector(

                    ".prize-type"

                ).value,

            color:

                card.querySelector(

                    ".prize-color"

                ).value,

            textColor:

                card.querySelector(

                    ".prize-text-color"

                ).value,

            image:

                card.querySelector(

                    ".prize-image"

                ).value,

            enabled:

                card.querySelector(

                    ".prize-enabled"

                ).checked

        });

    });

    savePrizes(

        prizes

    );

    notify(

        "Prize configuration saved."

    );

}





/* ==========================================================
   PART 3
   ANALYTICS
   HISTORY
   ACTIONS
========================================================== */

/* ==========================================================
   DOM
========================================================== */

let historyTable = null;

let exportAnalyticsButton = null;

let resetAnalyticsButton = null;

let resetPrizesButton = null;

/* ==========================================================
   EXTEND CACHE DOM
========================================================== */

const previousCacheDOMPart2 = cacheDOM;

cacheDOM = function(){

    previousCacheDOMPart2();

    historyTable =

        document.getElementById(

            "historyTable"

        );

    exportAnalyticsButton =

        document.getElementById(

            "exportAnalyticsBtn"

        );

    resetAnalyticsButton =

        document.getElementById(

            "resetAnalyticsBtn"

        );

    resetPrizesButton =

        document.getElementById(

            "resetPrizesBtn"

        );

};

/* ==========================================================
   EXTEND EVENTS
========================================================== */

const previousBindEventsPart2 = bindEvents;

bindEvents = function(){

    previousBindEventsPart2();

    if(exportAnalyticsButton){

        exportAnalyticsButton.addEventListener(

            "click",

            exportAnalyticsData

        );

    }

    if(resetAnalyticsButton){

        resetAnalyticsButton.addEventListener(

            "click",

            clearAnalytics

        );

    }

    if(resetPrizesButton){

        resetPrizesButton.addEventListener(

            "click",

            restoreDefaultPrizes

        );

    }

};

/* ==========================================================
   EXTEND DASHBOARD
========================================================== */

const previousLoadDashboardPart2 = loadDashboard;

loadDashboard = function(){

    previousLoadDashboardPart2();

    loadHistoryTable();

};

/* ==========================================================
   LOAD HISTORY
========================================================== */

function loadHistoryTable(){

    if(!historyTable){

        return;

    }

    historyTable.innerHTML = "";

    if(typeof getSpinHistory !== "function"){

        historyTable.innerHTML =

            "<tr><td colspan='3'>History unavailable.</td></tr>";

        return;

    }

    const history =

        getSpinHistory();

    if(history.length === 0){

        historyTable.innerHTML =

            "<tr><td colspan='3'>No spins recorded.</td></tr>";

        return;

    }

    history.forEach(function(item){

        const row =

            document.createElement(

                "tr"

            );

        row.innerHTML = `

            <td>

                ${formatDate(item.timestamp)}

            </td>

            <td>

                ${item.prize}

            </td>

            <td>

                ${formatResult(item.type)}

            </td>

        `;

        historyTable.appendChild(

            row

        );

    });

}

/* ==========================================================
   FORMAT DATE
========================================================== */

function formatDate(timestamp){

    const date =

        new Date(timestamp);

    return date.toLocaleString();

}

/* ==========================================================
   FORMAT RESULT
========================================================== */

function formatResult(type){

    switch(type){

        case "win":

            return "🏆 Win";

        case "lose":

            return "❌ Lose";

        case "retry":

            return "🔄 Retry";

        default:

            return type;

    }

}

/* ==========================================================
   EXPORT
========================================================== */

function exportAnalyticsData(){

    if(typeof exportAnalytics === "function"){

        exportAnalytics();

        notify(

            "Analytics exported."

        );

    }

}

/* ==========================================================
   RESET ANALYTICS
========================================================== */

function clearAnalytics(){

    const confirmed = confirm(

        "Reset all analytics?"

    );

    if(!confirmed){

        return;

    }

    if(typeof resetAnalytics === "function"){

        resetAnalytics();

    }

    loadDashboard();

    notify(

        "Analytics reset."

    );

}

/* ==========================================================
   RESET PRIZES
========================================================== */

function restoreDefaultPrizes(){

    const confirmed = confirm(

        "Restore default prizes?"

    );

    if(!confirmed){

        return;

    }

    if(typeof resetPrizes === "function"){

        resetPrizes();

    }

    loadDashboard();

    notify(

        "Default prizes restored."

    );

}
























/* ==========================================================
   PART 4
   VALIDATION
   STABLE IDS
   IMPROVED SAVE
========================================================== */

/* ==========================================================
   REPLACE CREATE PRIZE CARD
========================================================== */

createPrizeCard = function(prize,index){

    const card = document.createElement("div");

    card.className = "prize-card";

    /*
    ---------------------------------------
    Preserve original prize ID
    ---------------------------------------
    */

    card.dataset.id = prize.id;

    card.innerHTML = `

        <label>

            Prize Name

        </label>

        <input
            type="text"
            class="prize-name"
            value="${prize.name}"
        >

        <label>

            Chance (%)

        </label>

        <input
            type="number"
            class="prize-chance"
            value="${prize.chance}"
            min="0"
            max="100"
        >

        <label>

            Prize Type

        </label>

        <select
            class="prize-type"
        >

            <option value="win"
                ${prize.type==="win"?"selected":""}>
                Win
            </option>

            <option value="lose"
                ${prize.type==="lose"?"selected":""}>
                Lose
            </option>

            <option value="retry"
                ${prize.type==="retry"?"selected":""}>
                Retry
            </option>

        </select>

        <label>

            Slice Colour

        </label>

        <input
            type="color"
            class="prize-color"
            value="${prize.color}"
        >

        <label>

            Text Colour

        </label>

        <input
            type="color"
            class="prize-text-color"
            value="${prize.textColor}"
        >

        <label>

            Image Path

        </label>

        <input
            type="text"
            class="prize-image"
            value="${prize.image}"
        >

        <label>

            Enabled

        </label>

        <input
            type="checkbox"
            class="prize-enabled"
            ${prize.enabled ? "checked" : ""}
        >

    `;

    return card;

};

/* ==========================================================
   VALIDATE PRIZES
========================================================== */

function validatePrizes(prizes){

    let totalChance = 0;

    let enabledCount = 0;

    for(const prize of prizes){

        if(prize.enabled){

            enabledCount++;

            totalChance += prize.chance;

        }

        if(prize.name.trim() === ""){

            alert(

                "Every prize must have a name."

            );

            return false;

        }

        if(prize.chance < 0){

            alert(

                "Chance cannot be negative."

            );

            return false;

        }

    }

    if(enabledCount === 0){

        alert(

            "Enable at least one prize."

        );

        return false;

    }

    if(totalChance !== 100){

        alert(

            "Total enabled prize probability must equal 100%.\n\nCurrent Total = " +

            totalChance +

            "%"

        );

        return false;

    }

    return true;

}

/* ==========================================================
   IMPROVED SAVE
========================================================== */

savePrizeConfiguration = function(){

    const cards =

        document.querySelectorAll(

            ".prize-card"

        );

    const prizes = [];

    cards.forEach(function(card){

        prizes.push({

            id:Number(

                card.dataset.id

            ),

            name:

                card.querySelector(

                    ".prize-name"

                ).value.trim(),

            chance:Number(

                card.querySelector(

                    ".prize-chance"

                ).value

            ),

            type:

                card.querySelector(

                    ".prize-type"

                ).value,

            color:

                card.querySelector(

                    ".prize-color"

                ).value,

            textColor:

                card.querySelector(

                    ".prize-text-color"

                ).value,

            image:

                card.querySelector(

                    ".prize-image"

                ).value.trim(),

            enabled:

                card.querySelector(

                    ".prize-enabled"

                ).checked

        });

    });

    if(

        !validatePrizes(

            prizes

        )

    ){

        return;

    }

    savePrizes(

        prizes

    );

    loadDashboard();

    notify(

        "Prize configuration saved successfully."

    );

};

/* ==========================================================
   BETTER NOTIFICATION
========================================================== */

notify = function(message){

    console.log(

        "✔",

        message

    );

};

/* ==========================================================
   AUTO REFRESH
========================================================== */

window.addEventListener(

    "storage",

    function(){

        loadDashboard();

    }

);













/* ==========================================================
   PART 5
   FINAL UTILITIES
   DASHBOARD POLISH
========================================================== */

/* ==========================================================
   HISTORY SEARCH
========================================================== */

function searchHistory(keyword){

    if(typeof getSpinHistory !== "function"){

        return;

    }

    const history = getSpinHistory();

    const filtered = history.filter(function(item){

        return (

            item.prize.toLowerCase().includes(

                keyword.toLowerCase()

            ) ||

            item.type.toLowerCase().includes(

                keyword.toLowerCase()

            )

        );

    });

    renderFilteredHistory(filtered);

}

/* ==========================================================
   RENDER FILTERED HISTORY
========================================================== */

function renderFilteredHistory(history){

    if(!historyTable){

        return;

    }

    historyTable.innerHTML = "";

    if(history.length === 0){

        historyTable.innerHTML =

            "<tr><td colspan='3'>No matching records.</td></tr>";

        return;

    }

    history.forEach(function(item){

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>

                ${formatDate(item.timestamp)}

            </td>

            <td>

                ${item.prize}

            </td>

            <td>

                ${formatResult(item.type)}

            </td>

        `;

        historyTable.appendChild(row);

    });

}

/* ==========================================================
   PROBABILITY SUMMARY
========================================================== */

function calculateProbability(){

    const prizes = loadPrizes();

    let total = 0;

    prizes.forEach(function(prize){

        if(prize.enabled){

            total += prize.chance;

        }

    });

    return total;

}

/* ==========================================================
   CHECK CONFIGURATION
========================================================== */

function configurationHealthy(){

    return calculateProbability() === 100;

}

/* ==========================================================
   DASHBOARD REPORT
========================================================== */

function printDashboardReport(){

    console.group(

        "Spin2Win Dashboard"

    );

    console.log(

        "Statistics:",

        getAnalyticsSummary()

    );

    console.log(

        "Prizes:",

        loadPrizes()

    );

    console.log(

        "History:",

        getSpinHistory()

    );

    console.groupEnd();

}

/* ==========================================================
   AUTO HEALTH CHECK
========================================================== */

function dashboardHealthCheck(){

    if(!configurationHealthy()){

        console.warn(

            "Prize probability is not 100%."

        );

    }

}

/* ==========================================================
   REFRESH EVERYTHING
========================================================== */

function refreshEverything(){

    loadDashboard();

    dashboardHealthCheck();

}

/* ==========================================================
   INITIAL HEALTH CHECK
========================================================== */

window.addEventListener(

    "load",

    refreshEverything

);

/* ==========================================================
   PUBLIC EXPORTS
========================================================== */

window.searchHistory = searchHistory;

window.refreshEverything = refreshEverything;

window.printDashboardReport = printDashboardReport;

window.configurationHealthy = configurationHealthy;




