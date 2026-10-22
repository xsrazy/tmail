# TMail: Web Temp-Mail

A free temporary email web app. Pick any name and one of the available domains, and instantly get a working inbox in the browser. No registration, no password.

Live: https://tmail.xsrazy.web.id

## About

TMail gives anyone a disposable email address that works right away. Addresses are stateless: nothing is registered or stored per user, so typing the same name and domain again later reopens the same inbox. It is built for quick sign-ups and verification codes, the moments where a real inbox is too much hassle or too much exposure.

## Features

- Address picker: choose any name and one of 9 domains (myrobs.store, myrobs.web.id, sharecanva.com, sharecanva.web.id, xsrazy.my.id, deletecon.tech, kanpann.tech, rawaron.tech, terpo.tech)
- Inbox that refreshes automatically every 10 seconds, with a sound notification for new mail
- OTP helper: verification codes found in an email are shown large, with a one-tap copy button
- Email Saya (My Emails): addresses used before are saved in the browser's localStorage and can be reopened in one click
- Multiple addresses open at once in tabs, and an address can be shared through a QR code
- Warning for reserved names (support or admin style names), because mail to those names may be routed elsewhere by older rules
- Emails are stored for 24 hours and then deleted automatically

## Architecture

- Frontend: static HTML, CSS, and vanilla JavaScript single page app served by Vercel, with an Indonesian UI (light cream theme, teal and amber accents)
- State: all personal state (saved addresses, open tabs) lives only in the visitor's localStorage; there are no user accounts
- Mail intake: Cloudflare Email Routing catch-all rules on the 9 domains
- Storage: Cloudflare D1 database (`tmail-web`), with an hourly cron that deletes mail older than 24 hours

## How it works

1. A sender emails any address on one of the 9 domains
2. A Cloudflare Email Worker (`tmail-webhook`) receives the message, forwards a copy to the owner's Gmail, and posts the parsed email to this app's `/api/inbound` webhook on Vercel
3. The email is stored in the D1 database
4. The web API serves the inbox and message content for that address to anyone who opens it in the browser

## License

MIT. See [LICENSE](LICENSE).
