/* POST /api/spin  { deviceId }  -  draws one result for a registered device. */

import { readConfig, updateDevice, drawSpin, isValidDeviceId, json } from "../lib/state.mjs";

export default async function handler(request){

    if(request.method !== "POST"){
        return json({ error: "Use POST to spin." }, 405);
    }

    let body = {};

    try{
        body = await request.json();
    }
    catch{
        body = {};
    }

    if(!isValidDeviceId(body.deviceId)){
        return json({ error: "This device has not been set up.", code: "setup" }, 401);
    }

    try{
        const config = await readConfig();

        const { result } = await updateDevice(body.deviceId, device => {
            if(device.blocked){
                throw Object.assign(new Error("This device has been disabled."), { code: "blocked" });
            }
            return drawSpin(config, device);
        });

        return json({ result });
    }
    catch(error){

        if(error.code === "unknown"){
            return json({ error: "This device has not been set up.", code: "setup" }, 401);
        }

        if(error.code === "blocked"){
            return json({ error: error.message, code: "blocked" }, 403);
        }

        console.error("Spin failed:", error);
        return json({ error: "Could not complete the spin. Please try again." }, 503);
    }
}

export const config = {
    path: "/api/spin"
};
