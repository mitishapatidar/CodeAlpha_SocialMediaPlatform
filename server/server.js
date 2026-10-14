require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { connectDB, disconnectDB } = require('./config/db');
const { notFound, errorHandler } = require('./utils/errors');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-only-secret-change-me';
  console.warn('⚠️  JWT_SECRET not set — using an insecure development secret. Copy .env.example to .env.');
}

const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const page = (name) => (req, res) => res.sendFile(path.join(PUBLIC_DIR, name));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------- REST API ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search', require('./routes/search'));
app.use('/api', notFound);

// ---------- Static files & pages ----------
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));
app.use(express.static(PUBLIC_DIR, { index: false }));
app.get('/login', page('login.html'));
app.get('/signup', page('signup.html'));
// Every other route is handled by the single-page app's client-side router
app.get('/{*splat}', page('index.html'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Instaclone running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Could not connect to MongoDB:', err.message);
    process.exit(1);
  });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await disconnectDB();
    process.exit(0);
  });
}

module.exports = app;
