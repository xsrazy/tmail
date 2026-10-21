const { d1, parseAddress, DAY_MS } = require('./_d1');

module.exports = async (req, res) => {
  const q = req.query || {};
  const parsed = parseAddress(q.addr || '');
  const id = parseInt(q.id, 10);
  if (!parsed || !Number.isInteger(id) || id <= 0) {
    res.status(400).json({ ok: false, error: 'invalid parameters' });
    return;
  }
  try {
    if (req.method === 'GET') {
      const cutoff = Date.now() - DAY_MS;
      const r = await d1(
        'SELECT id, address, sender, subject, body_text, body_html, otp, received_at FROM messages WHERE id = ? AND address = ? AND received_at > ?',
        [id, parsed.address, cutoff]
      );
      const rows = r.results || [];
      if (!rows.length) {
        res.status(404).json({ ok: false, error: 'not found' });
        return;
      }
      res.status(200).json({ ok: true, message: rows[0] });
    } else if (req.method === 'DELETE') {
      await d1('DELETE FROM messages WHERE id = ? AND address = ?', [id, parsed.address]);
      res.status(200).json({ ok: true });
    } else {
      res.status(405).json({ ok: false, error: 'method not allowed' });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: 'storage failed' });
  }
};
