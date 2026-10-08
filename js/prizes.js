/* ==========================================================
   SPIN2WIN - KIBAO EDITION
   Reference wheel prize configuration
========================================================== */

const DEFAULT_PRIZES = [

    {
        id:1,
        designSlot:8,
        name:"Try Again Next Time",
        chance:22.5,
        color:"#F3BB17",
        textColor:"#DB1212",
        image:"",
        enabled:true,
        type:"retry"
    },

    {
        id:2,
        designSlot:1,
        name:"Bucket Hat",
        chance:2.5,
        color:"#FFFFFF",
        textColor:"#771030",
        image:"assets/images/reference/bucket_hat.png",
        enabled:true,
        type:"win"
    },

    {
        id:3,
        designSlot:2,
        name:"Try Again Next Time",
        chance:22.5,
        color:"#771030",
        textColor:"#FFFFFF",
        image:"",
        enabled:true,
        type:"retry"
    },

    {
        id:4,
        designSlot:3,
        name:"T-Shirt",
        chance:2.5,
        color:"#DB1212",
        textColor:"#FFFFFF",
        image:"assets/images/reference/tshirt.png",
        enabled:true,
        type:"win"
    },

    {
        id:5,
        designSlot:4,
        name:"Try Again Next Time",
        chance:22.5,
        color:"#F3BB17",
        textColor:"#DB1212",
        image:"",
        enabled:true,
        type:"retry"
    },

    {
        id:6,
        designSlot:5,
        name:"Wristband",
        chance:2.5,
        color:"#FFFFFF",
        textColor:"#771030",
        image:"assets/images/reference/wristband.png",
        enabled:true,
        type:"win"
    },

    {
        id:7,
        designSlot:6,
        name:"Try Again Next Time",
        chance:22.5,
        color:"#771030",
        textColor:"#FFFFFF",
        image:"",
        enabled:true,
        type:"retry"
    },

    {
        id:8,
        designSlot:7,
        name:"Tumbler",
        chance:2.5,
        color:"#DB1212",
        textColor:"#FFFFFF",
        image:"assets/images/reference/tumbler.png",
        enabled:true,
        type:"win"
    }
];

/* Versioned key forces the redesigned wheel defaults to load once
   instead of retaining the old 2026 wheel configuration. */
const PRIZE_STORAGE_KEY = "spin2win_prizes_kibao_reference_v4";

function loadPrizes(){

    const stored = localStorage.getItem(PRIZE_STORAGE_KEY);

    if(!stored){
        return DEFAULT_PRIZES.map(prize => ({...prize}));
    }

    try{
        return JSON.parse(stored);
    }
    catch(error){
        console.error("Unable to load saved prizes.");
        return DEFAULT_PRIZES.map(prize => ({...prize}));
    }
}

function savePrizes(prizes){
    localStorage.setItem(PRIZE_STORAGE_KEY, JSON.stringify(prizes));
}

function resetPrizes(){
    savePrizes(DEFAULT_PRIZES.map(prize => ({...prize})));
}

function getEnabledPrizes(){
    return loadPrizes().filter(prize => prize.enabled);
}

function getTotalChance(){
    return getEnabledPrizes().reduce(
        (sum, prize) => sum + Number(prize.chance || 0),
        0
    );
}

function getRandomPrize(){

    const prizes = getEnabledPrizes();

    if(!prizes.length){
        return null;
    }

    const totalChance = getTotalChance();

    let random = Math.random() * totalChance;

    for(const prize of prizes){

        random -= Number(prize.chance || 0);

        if(random <= 0){
            return prize;
        }
    }

    return prizes[prizes.length - 1];
}
