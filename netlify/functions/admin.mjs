/* POST /api/admin  -  password-protected admin actions. */

import {
    readConfig,
    updateConfig,
    listDevices,
    updateDevice,
    buildReport,
    checkPassword,
    applyPrizeEdits,
    restoreDefaultOdds,
    dayKey,
    json
} from "../lib/state.mjs";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

async function report(day){
    const [config, devices] = await Promise.all([readConfig(), listDevices()]);
    return buildReport(config, devices, DAY_PATTERN.test(day || "") ? day : dayKey());
}

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
            case "state":
                return json({ report: await report(body.day) });

            case "savePrizes":
                await updateConfig(config => applyPrizeEdits(config, body.prizes));
                return json({ report: await report(body.day), message: "Prize settings saved for all devices." });

            case "restoreDefaults":
                await updateConfig(restoreDefaultOdds);
                return json({ report: await report(body.day), message: "Default odds restored (5% to win)." });

            case "renameDevice":
                await updateDevice(body.deviceId, device => {
                    device.name = String(body.name || "").trim().slice(0, 60);
                });
                return json({ report: await report(body.day), message: "Device renamed." });

            case "setBlocked":
                await updateDevice(body.deviceId, device => {
                    device.blocked = Boolean(body.blocked);
                });
                return json({
                    report: await report(body.day),
                    message: body.blocked ? "Device disabled. It can no longer spin." : "Device enabled."
                });

            case "refillDevice":{
                const today = dayKey();
                await updateDevice(body.deviceId, device => {
                    if(device.days[today]){
                        device.days[today].given = {};
                    }
                });
                return json({ report: await report(body.day), message: "Today's stock refilled for this device." });
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
