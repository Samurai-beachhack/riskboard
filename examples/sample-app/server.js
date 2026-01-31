// Sample backend – triggers several rules (no auth, no validation, empty catch)
const express = require('express');
const csrf = require('csurf'); // import csurf middleware
const app = express();
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection); 

// add this middleware to specific routes if you don't want to apply it globally
// app.get('/specific-route', csrfProtection, (req, res) => {
//   // route handler
// });

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
