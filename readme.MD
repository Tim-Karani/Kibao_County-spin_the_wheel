# Spin the Wheel — County Kibao

A spin-the-wheel game for County Kibao weekend activations. Every result is drawn on the Netlify server, so all tablets share the same odds and settings, and the admin page sees every spin.

- Player page: `https://spin-the-wheel-county-kibao.netlify.app/`
- Admin page: `https://spin-the-wheel-county-kibao.netlify.app/admin.html` (password protected)

---

## Prizes, odds and daily stock

| Slice | Brand | Chance per spin | About 1 in… | Daily stock per device |
|---|---|---|---|---|
| County Bucket Hat | County | 1.25% | 80 | 10 |
| Kibao T-Shirt | Kibao | 1.25% | 80 | 20 |
| County T-Shirt | County | 1.25% | 80 | 20 |
| Kibao Tumbler | Kibao | 1.25% | 80 | 20 |
| **Any gift** | | **5%** | **20** | **70** |
| Try Again Next Time (4 slices × 23.75%) | | 95% | — | — |

- **Each tablet counts as one outlet.** Every registered device gets the full daily stock above.
- **Stock refills every day at 6:00 am** (Nairobi time). A late Saturday night counts as Saturday until 6:00 am Sunday. Unused gifts do not carry over.
- When a device has given out its daily stock of a gift (or the gift is paused), anyone on that device who would have won it gets **Try Again**. The other gifts keep their own odds.
- Odds and daily stock can be changed on the admin page. They apply to every device.

> The wheel artwork is `assets/images/wheel-reference.jpg`. To change it, replace that file with a square image of the full wheel, with the same slice positions (the wheel filling the image, slice edges on the vertical, horizontal and diagonal lines through the centre).

## Devices

- There is nothing to set up. The first time a phone or tablet opens the game link, it registers itself automatically and appears on the admin page as one outlet (e.g. "Device 3F2A"). Use **Rename** on the admin page to label it, e.g. "Tablet 3 – Nairobi North".
- Use the device's normal browser (not private/incognito mode), and don't clear its browsing data. Otherwise it is treated as a new device with a fresh daily stock.
- Anyone who opens the link (for example the client checking the game) also counts as a device. Their spins appear in the stats; use **Disable** on the admin page for any device that shouldn't be playing. Share the link only with brand ambassadors.

## Admin page

- **Day picker:** see any day's results (each day runs 6:00 am to 6:00 am).
- **Totals for the day:** devices active, spins, wins, losses, actual win rate, plus all-time totals.
- **Prizes, odds & daily stock:** change chances (must total 100%), pause a gift, change daily stock per device.
- **Devices (outlets):** every tablet with today's gifts given / daily stock. Actions:
  - **Rename** – give it a recognisable name.
  - **Refill today** – give that device a fresh daily stock (e.g. if stock was added).
  - **Disable / Enable** – stop a lost or misused device from spinning.
- **Spin history:** every spin for the day with device, prize and outcome; search, filter, and **Export CSV** (per-device summary plus every spin) for reporting.

---

## Netlify settings

One environment variable (Project configuration → Environment variables → Add a variable):

| Key | What it is |
|---|---|
| `ADMIN_PASSWORD` | Password for the admin page |

After adding or changing it: **Deploys → Trigger deploy → Deploy project**.

## Deploying updates

The site deploys from GitHub (`Tim-Karani/Kibao_County-spin_the_wheel`). Upload the new files to the repository and Netlify redeploys automatically. Settings, devices and history are stored in Netlify Blobs and are kept between deploys.

Each tablet needs an internet connection to spin. If it can't reach the server, the player sees *"Connection problem. Please check the internet and spin again."* and no spin happens.

## Project layout

```
index.html              Player page
admin.html              Admin page
css/                    Styles
js/wheel.js             Wheel drawing, gold ring and spin animation
js/app.js               Player controller: registers the device, asks the server for each result
js/popup.js             Result popup
js/sounds.js            Sound playback and mute button
js/admin.js             Admin dashboard
assets/images/          Wheel artwork, logos, prize images
assets/sounds/          Game sounds
netlify/functions/      spin.mjs (/api/spin), device.mjs (/api/device), admin.mjs (/api/admin)
netlify/lib/state.mjs   Odds, daily stock, 6:00 am refill, devices and reports
netlify.toml            Netlify settings
package.json            Server dependency (@netlify/blobs)
```
