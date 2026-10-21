# Temp-mail Web — SPEC (locked by user 21 Oct 2026 15:21 WIB)

## Identity
- Name: **Temp-mail**
- URL: **https://tmail.xsrazy.web.id** (new Vercel project `tmail`)
- Tagline (Indonesian UI): "Email sementara gratis, tanpa daftar"
- NO em dash anywhere in copy. Plain Indonesian UI.

## Email domains offered (9 — xsrazy.web.id is FORBIDDEN as an email domain here)
myrobs.store, myrobs.web.id, sharecanva.com, sharecanva.web.id, xsrazy.my.id,
deletecon.tech, kanpann.tech, rawaron.tech, terpo.tech

## Core behavior
- Address = name@domain, fully stateless: entering an existing name + domain REOPENS
  its inbox (user requirement). No signup, no password.
- Inbox auto-refresh every 10s + manual refresh button.
- Emails auto-delete after 24 hours (cleanup + read filter).
- Reserved names (email, support, admin, github, me, canva, etc.) show a warning that
  mail to them may be routed elsewhere (existing CF rules), mirror the bot's list if found
  in ~/workspace/temp-mail-bot/.

## Features (ALL approved, must include)
1. OTP auto-detect (regex 4-8 digit codes near OTP/kode/code keywords + standalone
   verification-code patterns): show big in the reading view AND as a chip in list rows,
   with one-tap copy.
2. Multiple addresses as TABS; saved addresses list ("Email Saya") in localStorage.
3. QR code of current address (client-side; bundle a small QR lib locally, no runtime CDN).
4. Sound notification on new mail (WebAudio beep, subtle, mute toggle; init on first click).
5. Copy address button, random-name generator, custom name input, domain dropdown.
6. Read full email (text + sanitized HTML), delete single email, clear inbox.

## Design (IMPORTANT: must NOT look like his other webs — no navy #10162a, no violet #a98be8)
- Light theme: warm cream background (#FAF7F2 family), ink text (#1F2430),
  primary teal (#0E7C7B), accent amber (#F59E0B). Rounded, friendly, clean.
- Logo: envelope + hourglass mark in teal/amber, hand-made SVG.
  Favicon: full set from the logo (svg + png 32/180/192/512).
  OG image: 1200x630 PNG (logo + name + tagline), og meta complete.

## Architecture
- Vercel project `tmail`: static frontend (index.html, styles.css, app.js, assets/)
  + serverless API in /api/*.js (Node, no build step, plain project like tikbulk-site).
- Storage: **Cloudflare D1** (new database `tmail-web`). Table messages:
  id INTEGER PK, address TEXT, domain TEXT, sender TEXT, subject TEXT,
  body_text TEXT, body_html TEXT, otp TEXT, received_at INTEGER (epoch ms).
  Index on (address, received_at).
- API endpoints:
  - POST /api/inbound — from Email Worker only; requires header `x-tmail-key` == env INBOUND_KEY.
    Body JSON: {address, from, subject, text, html, date}.
  - GET /api/inbox?addr= — list (max 50, newest first, last 24h only).
  - GET /api/message?id=&addr= — full message.
  - DELETE /api/message?id=&addr= ; DELETE /api/inbox?addr=
  - API talks to D1 via Cloudflare REST API using a SCOPED token (D1 only) stored as
    Vercel env CF_D1_TOKEN; account id + database id as env too.
- Email intake: ONE Cloudflare Email Worker `tmail-webhook` (postal-mime for parsing):
  on email(): FIRST `await message.forward("emailmuseai@gmail.com")` (keeps the existing
  Gmail + Telegram bot flow untouched), THEN parse and POST to
  https://tmail.xsrazy.web.id/api/inbound with the key, inside try/catch so a webhook
  failure never breaks forwarding. Plus a scheduled() cron in the same worker deleting
  D1 rows older than 24h (D1 binding).
  Worker is deployed in this phase but NOT attached to any zone's routing yet.

## Phase boundary (this build)
BUILD + DEPLOY everything, attach domain, QA the UI using a test row inserted
through /api/inbound with the key (fake email), verify: list, OTP chip, read view,
QR, tabs, delete. DO NOT change any zone's Email Routing rules in this phase.
DO NOT touch the Telegram bots, the Gmail poller, or any existing catch-all.

## Secrets handling
- Cloudflare token: ~/.config/cloudflare/api_token_new (full access; use for D1 create,
  worker deploy via wrangler with CLOUDFLARE_API_TOKEN env, scoped-token creation).
  Never print token values anywhere.
- Vercel token: ~/.config/vercel/api_token. Real CLI: `npx -y vercel`.
- INBOUND_KEY: generate a random key, store as Vercel env + worker secret/var.
  Never print it in reports.
- Wrangler: `npx -y wrangler` (deploy worker, create D1). postal-mime via npm install
  in the worker folder and wrangler bundling.

## QA + report back
Report: Vercel project + production URL, domain verified status, D1 db id (id only),
worker name + deployed status, QA checklist results (each feature), files created,
and anything blocked. Include WIB timestamps.
