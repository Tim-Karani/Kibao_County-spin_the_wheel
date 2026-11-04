/* POST /api/admin  -  password-protected admin actions. */

import {
    readState,
    updateState,
    checkPassword,
    applyPrizeEdits,
    resetStats,
    restoreDefaultOdds,
    json
} from "../lib/state.mjs";

export default async function handler(request){

    if(request.method !== "POST"){
        return json({ error: "Use POST." }, 405);
    }

    const auth = checkPassword(request);

    if(!auth.ok){
        // Slow down password guessing.
        await new Promise(resolve => setTimeout(resolve, 800));
        return json({ error: auth.error }, auth.status);
    }

    let body = {};

    try{
        body = await request.json();
    }
    catch{
        body = {};
    }

    try{

        switch(body.action){

            case "login":
            case "state":{
                const state = await readState();
                return json({ state });
            }

            case "savePrizes":{
                const { state } = await updateState(s => applyPrizeEdits(s, body.prizes));
                return json({ state, message: "Prize settings saved." });
            }

            case "resetStats":{
                const { state } = await updateState(resetStats);
                return json({ state, message: "Statistics and spin history cleared." });
            }

            case "restoreDefaults":{
                const { state } = await updateState(restoreDefaultOdds);
                return json({ state, message: "Default odds restored (5% to win). Stock was not changed." });
            }

            default:
                return json({ error: "Unknown action." }, 400);
        }
    }
    catch(error){
        console.error("Admin action failed:", error);
        return json({ error: error.message || "Something went wrong." }, 400);
    }
}

export const config = {
    path: "/api/admin"
};
