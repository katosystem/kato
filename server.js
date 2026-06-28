require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  initDatabase,
  getStats,
  getAllPasses,
  getPassById,
  createPass,
  deletePass,
  validateUser,
  getRecentByMaterial
} = require('./database');
const { isConnected } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  const connected = isConnected();
  res.json({
    status: connected ? 'ok' : 'error',
    database: connected ? 'MongoDB Atlas connected' : 'Not connected'
  });
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const valid = await validateUser(username, password);
    if (valid) return res.json({ success: true });
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    res.json(await getStats());
  } catch (err) {
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

app.get('/api/passes', async (req, res) => {
  try {
    const search = req.query.search || '';
    const month = req.query.month || '';
    res.json(await getAllPasses(search, month));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load passes' });
  }
});

app.get('/api/passes/:id', async (req, res) => {
  try {
    const pass = await getPassById(req.params.id);
    if (!pass) return res.status(404).json({ message: 'Pass not found' });
    res.json(pass);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load pass' });
  }
});

app.post('/api/passes', async (req, res) => {
  try {
    const note = (req.body.note || '').trim();
    if (!note) {
      return res.status(400).json({ message: 'Note is required' });
    }
    const pass = await createPass({ ...req.body, note });
    res.status(201).json(pass);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save pass' });
  }
});

app.delete('/api/passes/:id', async (req, res) => {
  try {
    await deletePass(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete pass' });
  }
});

app.get('/api/material-stats', async (req, res) => {
  try {
    res.json(await getRecentByMaterial());
  } catch (err) {
    res.status(500).json({ message: 'Failed to load material stats' });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Kato server running on port ${PORT}`);
    console.log(`Login: http://localhost:${PORT}/index.html`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB Atlas:', err.message);
  process.exit(1);
});
