/* POST /api/spin  -  draws one result on the server for any device. */

import { updateState, drawSpin, json } from "../lib/state.mjs";

export default async function handler(request){

    if(request.method !== "POST"){
        return json({ error: "Use POST to spin." }, 405);
    }

    try{
        const { result } = await updateState(drawSpin);
        return json({ result });
    }
    catch(error){
        console.error("Spin failed:", error);
        return json({ error: "Could not complete the spin. Please try again." }, 503);
    }
}

export const config = {
    path: "/api/spin"
};
