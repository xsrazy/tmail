const crypto = require('crypto');
const { d1, parseAddress, extractOtp, DAY_MS } = require('./_d1');

function keyOk(given) {
  const expected = process.env.INBOUND_KEY || '';
  if (!given || !expected) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }
  if (!keyOk(req.headers['x-tmail-key'])) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ ok: false, error: 'invalid json' });
    return;
  }
  const parsed = parseAddress(body.address);
  if (!parsed) {
    res.status(400).json({ ok: false, error: 'invalid address' });
    return;
  }
  const sender = String(body.from || '').slice(0, 320);
  const subject = String(body.subject || '').slice(0, 500) || '(tanpa subjek)';
  const text = String(body.text || '').slice(0, 200000);
  const html = String(body.html || '').slice(0, 400000);
  let received = Date.parse(body.date || '');
  if (Number.isNaN(received)) received = Date.now();
  // Clamp absurd timestamps into a sane window around now. received_at must
  // reflect arrival time: a stale or forged sender Date header would make the
  // row instantly invisible (24h read filter) and cron-bait, so clamp old
  // dates up to now as well.
  if (received > Date.now() + 60 * 60 * 1000) received = Date.now();
  if (received < Date.now() - DAY_MS) received = Date.now();
  const otp = extractOtp(subject, text);
  try {
    const r = await d1(
      'INSERT INTO messages (address, domain, sender, subject, body_text, body_html, otp, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [parsed.address, parsed.domain, sender, subject, text, html, otp, received]
    );
    res.status(200).json({ ok: true, id: r.meta && r.meta.last_row_id });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'storage failed' });
  }
};
