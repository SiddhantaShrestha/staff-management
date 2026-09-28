require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const { requireAuth } = require('./middleware/auth');
const { seedIfEmpty } = require('./seed');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', requireAuth, require('./routes/users'));
app.use('/api/employees', requireAuth, require('./routes/employees'));
app.use('/api/clients', requireAuth, require('./routes/clients'));
app.use('/api/assignments', requireAuth, require('./routes/assignments'));
app.use('/api/attendance', requireAuth, require('./routes/attendance'));
app.use('/api/leaves', requireAuth, require('./routes/leaves'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/reports', requireAuth, require('./routes/reports'));

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

app.use((err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'A record with this value already exists (email or code must be unique)' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ message: 'Linked record does not exist' });
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;

initDb()
  .then(seedIfEmpty)
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Failed to start. Check your MySQL settings in server/.env\n', err.message);
    process.exit(1);
  });
