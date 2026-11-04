# Spin the Wheel — County Kibao

A spin-the-wheel game for County Kibao activations. Players tap the wheel (or **SPIN THE WHEEL**); the result is drawn on the Netlify server so **every device, in every location, shares the same odds, stock and statistics**.

- Player page: `https://YOUR-SITE.netlify.app/`
- Admin page: `https://YOUR-SITE.netlify.app/admin.html` (password protected)

---

## Odds

| Slice | Chance per spin |
|---|---|
| Bucket Hat | 1.25% |
| T-Shirt | 1.25% |
| Wristband | 1.25% |
| Tumbler | 1.25% |
| **Any prize** | **5% (about 1 in 20 spins)** |
| Try Again Next Time (4 slices × 23.75%) | 95% |

Odds can be changed on the admin page (all eight slices must add up to 100%).
**Restore default odds** puts these values back.

## Stock

- Each prize has a **Stock left** number on the admin page. Leave it blank for unlimited.
- Every prize won on any device takes 1 off the shared stock, so stock is never given out twice, even when several tablets spin at the same moment.
- When a prize reaches 0, or you untick **In play**, anyone who would have won it gets **Try Again** instead. The other prizes keep their own odds, so the overall win rate drops a little while a prize is out.
- To restock, type the new number in **Stock left** and press **Save changes**.

## Admin page

- Log in with the password you set in Netlify (see below). The server checks it on every request; the page forgets it when the tab is closed.
- Live totals: spins, wins, losses (Try Again) and actual win rate. The page refreshes every 15 seconds.
- Prize table: odds, in play on/off, stock left, number given out, status (In play / Low stock / Out of stock / Paused).
- Spin history: latest 1,000 spins from all devices, searchable, exportable to CSV (Excel).
- Reset: clear stats & history, or restore default odds. Stock is kept in both cases.

## Sound

Spin, pointer tick, win, lose and button sounds are in `assets/sounds/`. Sound starts after the first tap (browsers block it before that). The speaker button in the top-right corner mutes it on that device. To use your own sounds, replace the MP3 files and keep the same file names.

---

## Deploying on Netlify (via GitHub)

The shared stock and stats need Netlify Functions, which do **not** run on a drag-and-drop upload. Deploy from GitHub instead:

1. **Upload the files to GitHub.** Put the contents of this folder in your repository (`Tim-Karani/Kibao_County-spin_the_wheel`), replacing the old files. Make sure `netlify.toml`, `package.json` and the `netlify/` folder are included.
2. **Connect the repository to Netlify.**
   - Using your existing site (keeps the same web address): *Site configuration → Build & deploy → Continuous deployment → Link repository*, then pick the repository.
   - Or create a new site: *Add new site → Import an existing project → GitHub*.
   - Leave the build settings as they are; `netlify.toml` fills them in.
3. **Set the admin password.** *Site configuration → Environment variables → Add a variable*:
   - Key: `ADMIN_PASSWORD`
   - Value: a strong password (at least 12 characters, not a word that's easy to guess).
4. **Deploy.** *Deploys → Trigger deploy → Deploy site*. (Needed after you add or change the password.)
5. Open `/admin.html`, log in, enter your stock numbers and press **Save changes**.

Every time you push changes to GitHub, Netlify redeploys automatically. Stock, odds and stats are kept between deploys (they are stored in Netlify Blobs, not in the code).

### Good to know

- Each device needs an internet connection to spin. If a device can't reach the server, the player sees *"Connection problem. Please check the internet and spin again."* and no spin happens.
- Netlify Functions and Blobs are included in Netlify's free plan, with monthly usage limits; a typical activation uses far less.

## Project layout

```
index.html              Player page
admin.html              Admin page
css/                    Styles
js/wheel.js             Wheel drawing and spin animation (fixed slice table)
js/app.js               Player controller, asks the server for each result
js/popup.js             Result popup
js/sounds.js            Sound playback and mute button
js/admin.js             Admin dashboard
assets/images/          Wheel artwork, logos, prize images
assets/sounds/          Game sounds
netlify/functions/      spin.mjs (/api/spin) and admin.mjs (/api/admin)
netlify/lib/state.mjs   Odds, stock, stats and default settings
netlify.toml            Netlify settings
package.json            Server dependency (@netlify/blobs)
```
