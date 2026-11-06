/*
 * POST /api/device
 *   { action: "register" }              -> registers a new device automatically
 *   { action: "check", deviceId }       -> is this device still valid?
 */

import { createDevice, readDevice, shortCode, json } from "../lib/state.mjs";

export default async function handler(request){

    if(request.method !== "POST"){
        return json({ error: "Use POST." }, 405);
    }

    let body = {};

    try{
        body = await request.json();
    }
    catch{
        body = {};
    }

    try{

        if(body.action === "register"){

            const device = await createDevice(body.name);

            return json({
                deviceId: device.id,
                code: shortCode(device.id),
                name: device.name
            });
        }

        if(body.action === "check"){

            const device = await readDevice(body.deviceId);

            if(!device){
                return json({ status: "setup" });
            }

            return json({
                status: device.blocked ? "blocked" : "ok",
                code: shortCode(device.id),
                name: device.name
            });
        }

        return json({ error: "Unknown action." }, 400);
    }
    catch(error){
        console.error("Device action failed:", error);
        return json({ error: "Something went wrong. Please try again." }, 503);
    }
}

export const config = {
    path: "/api/device"
};
