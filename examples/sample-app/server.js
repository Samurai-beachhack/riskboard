// Sample backend – triggers several rules (no auth, no validation, empty catch)
const express = require('express');
const app = express();

app.get('/api/users/:id', (req, res) => {
  const id = req.params.id;
  res.json({ id });
});

app.post('/api/admin/delete', async (req, res) => {
  try {
  } catch (e) {}
  res.json({ ok: true });
});

app.listen(3000, '0.0.0.0');
