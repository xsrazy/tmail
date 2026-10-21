// Shared helper: query Cloudflare D1 via REST API using a D1-scoped token.
async function d1(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CF_D1_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error('D1 query failed: ' + JSON.stringify(data.errors || data));
  }
  return data.result[0];
}

const DOMAINS = [
  'myrobs.store',
  'myrobs.web.id',
  'sharecanva.com',
  'sharecanva.web.id',
  'xsrazy.my.id',
  'deletecon.tech',
  'kanpann.tech',
  'rawaron.tech',
  'terpo.tech',
];

function parseAddress(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const addr = raw.trim().toLowerCase();
  const m = addr.match(/^([a-z0-9][a-z0-9._-]{0,62}[a-z0-9]|[a-z0-9])@([a-z0-9.-]+)$/);
  if (!m) return null;
  if (!DOMAINS.includes(m[2])) return null;
  return { address: addr, local: m[1], domain: m[2] };
}

// OTP detection: codes near OTP/kode/code keywords first, then standalone lines,
// then "adalah 123456" style phrasing. Returns the code string or null.
function extractOtp(subject, text) {
  const hay = `${subject || ''}\n${text || ''}`.slice(0, 30000);
  const kw = /(otp|one[\s-]?time|kode|code|verifikasi|verification|pin|auth|sandi|security)/i;
  const lines = hay.split(/\r?\n/);
  for (const line of lines) {
    if (kw.test(line)) {
      const m = line.match(/(?<!\d)(\d{4,8})(?!\d)/);
      if (m) return m[1];
    }
  }
  for (const line of lines) {
    const t = line.trim();
    if (/^\d{4,8}$/.test(t)) return t;
  }
  const m2 = hay.match(/(?:adalah|is|:)\s*(\d{4,8})(?!\d)/i);
  if (m2) return m2[1];
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

module.exports = { d1, DOMAINS, parseAddress, extractOtp, DAY_MS };
