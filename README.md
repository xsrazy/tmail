# Temp-mail

**Live: https://tmail.xsrazy.web.id**

Temp-mail is a free temporary email web app with an Indonesian interface. Pick any name, choose one of 9 custom domains, and you instantly have a working inbox in the browser. No registration and no password. It is made for receiving sign-up emails and verification codes without exposing your real address.

The 9 email domains are: myrobs.store, myrobs.web.id, sharecanva.com, sharecanva.web.id, xsrazy.my.id, deletecon.tech, kanpann.tech, rawaron.tech and terpo.tech.

## What's Inside

- **Instant, stateless addresses:** type any name, pick a domain, done. Addresses are stateless, so entering the same name and domain later reopens the exact same inbox.
- **OTP auto-detection:** verification codes (4 to 8 digits near words like OTP, kode or code, plus standalone code patterns) are detected automatically. The code is shown big in the reading view and as a chip in the inbox list, with one-tap copy.
- **Multiple addresses as tabs:** open several addresses at once and switch between them. Your addresses are saved in the "Email Saya" list in localStorage.
- **Auto-refresh inbox:** the inbox refreshes every 10 seconds, plus a manual refresh button.
- **QR code:** every address has a QR code (generated client-side with a locally bundled library, no external CDN) so you can open the same address on another device.
- **Sound notification:** a subtle WebAudio beep when new mail arrives, with a mute toggle.
- **Full reading view:** read the complete email as text or sanitized HTML, delete a single email, or clear the whole inbox.
- **Random name generator** and one-tap address copy.
- **Reserved name warning:** names like email, support, admin or github show a warning because mail to them may be routed elsewhere by existing mail rules.
- **Automatic cleanup:** every email is deleted after 24 hours.

## Frontend

- Static site: `index.html`, `styles.css` and `app.js` in vanilla HTML, CSS and JavaScript. No framework and no build step.
- Light, friendly design that deliberately differs from the owner's other sites: warm cream background, ink text, teal primary color (#0E7C7B) and amber accents.
- Hand-made SVG logo (envelope plus hourglass), a full favicon set and a complete Open Graph image.

## Backend

Four Vercel serverless functions in `api/` talk to a Cloudflare D1 database named `tmail-web`:

- `POST /api/inbound`: receives parsed emails from the mail worker. Protected by an `x-tmail-key` header that must match a server-side secret.
- `GET /api/inbox?addr=`: lists the inbox for an address, newest first, maximum 50 messages, only the last 24 hours.
- `GET /api/message?id=&addr=`: returns one full message.
- Delete operations for a single message and for clearing an inbox.

The D1 table `messages` stores id, address, domain, sender, subject, text body, HTML body, the detected OTP, and the receive timestamp, indexed by address and time. `_d1.js` is the small shared client that queries D1 through the Cloudflare REST API.

## How Mail Arrives

1. Cloudflare Email Routing catch-all rules on all 9 domains send incoming mail to a Cloudflare Email Worker named `tmail-webhook`.
2. The worker forwards a copy to a Gmail mailbox (so nothing is ever lost) and POSTs the parsed message to `/api/inbound`.
3. The message lands in D1 and appears in the web inbox within seconds. An hourly cleanup removes everything older than 24 hours.

## Project Structure

```
index.html     App shell
app.js         All client logic: tabs, inbox polling, OTP chips, QR, sounds
styles.css     Cream and teal theme
api/           inbound.js, inbox.js, message.js, _d1.js (D1 client)
assets/        Logo, favicons, OG image, bundled QR library
```
