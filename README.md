# TMail Web

**Live: https://tmail.xsrazy.web.id**

A web-based temporary email service. Create an address on any of the available domains and read incoming mail instantly in the browser, no account needed.

## Features

- Free choice of address name across 9 domains
- Automatic OTP detection with one-tap copy
- Multiple addresses in tabs, your addresses saved in the browser
- QR code for sharing an address, new-mail sound notification
- Mail is stored for 24 hours, then automatically deleted

## How it works

Cloudflare Email Routing catches all mail for the connected domains and forwards it through an Email Worker to the webhook in `api/inbound.js`, which stores messages in a Cloudflare D1 database. The static frontend (`index.html`, `app.js`) reads them through the serverless API in `api/`. Deployed on Vercel, connected to this repo.
