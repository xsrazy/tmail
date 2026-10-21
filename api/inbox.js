const { d1, parseAddress, DAY_MS } = require('./_d1');

module.exports = async (req, res) => {
  const parsed = parseAddress((req.query && req.query.addr) || '');
  if (!parsed) {
    res.status(400).json({ ok: false, error: 'invalid address' });
    return;
  }
  try {
    if (req.method === 'GET') {
      const cutoff = Date.now() - DAY_MS;
      const r = await d1(
        "SELECT id, sender, subject, otp, received_at, substr(replace(body_text, char(10), ' '), 1, 140) AS snippet FROM messages WHERE address = ? AND received_at > ? ORDER BY received_at DESC, id DESC LIMIT 50",
        [parsed.address, cutoff]
      );
      res.status(200).json({ ok: true, address: parsed.address, messages: r.results || [] });
    } else if (req.method === 'DELETE') {
      await d1('DELETE FROM messages WHERE address = ?', [parsed.address]);
      res.status(200).json({ ok: true });
    } else {
      res.status(405).json({ ok: false, error: 'method not allowed' });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: 'storage failed' });
  }
};
