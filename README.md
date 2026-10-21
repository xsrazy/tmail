# TMail: Web Temp-Mail

**Live: https://tmail.xsrazy.web.id**

TMail is a free temporary email web app. Visitors pick any name and one of the available domains, and instantly get a working inbox in the browser. No registration and no password: addresses are stateless, so typing the same name and domain again later reopens the same inbox.

## Site Contents

- **Address picker:** choose a name and a domain. Available domains: myrobs.store, myrobs.web.id, sharecanva.com, sharecanva.web.id, xsrazy.my.id, deletecon.tech, kanpann.tech, rawaron.tech, terpo.tech.
- **Inbox:** refreshes automatically every 10 seconds. Emails are stored for 24 hours and then deleted automatically.
- **OTP helper:** verification codes found in an email are shown large with a one-tap copy button.
- **Email Saya (My Emails):** addresses used before are saved in the browser's localStorage on the visitor's device and can be reopened in one click. Multiple addresses can be kept open in tabs, and an address can be shared through a QR code.
- Reserved names (such as support or admin style names) show a warning, because mail to those names may be routed elsewhere by older rules.

## Frontend

- Static HTML, CSS, and vanilla JavaScript single page app served by Vercel.
- The UI is in Indonesian, with a light cream theme, teal and amber accents, and a sound notification for new mail.
- All personal state (saved addresses, open tabs) lives only in the visitor's localStorage.

## Backend

- Mail arrives through Cloudflare Email Routing catch-all rules on the 9 domains above.
- A Cloudflare Email Worker (`tmail-webhook`) receives each message, forwards a copy to the owner's Gmail, and posts the parsed email to this app's `/api/inbound` webhook on Vercel.
- Emails are stored in a Cloudflare D1 database (`tmail-web`). An hourly cron deletes mail older than 24 hours.
- The web API serves the inbox and message content for an address; nothing is tied to user accounts, because there are none.
