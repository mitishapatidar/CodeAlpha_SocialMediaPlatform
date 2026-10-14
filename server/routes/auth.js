const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { HttpError } = require('../utils/errors');
const { RESERVED_USERNAMES } = require('../utils/reserved');

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/auth/check-username?username=foo  → live availability check on the sign-up form
router.get('/check-username', async (req, res) => {
  const username = String(req.query.username || '').toLowerCase().trim();
  if (!USERNAME_RE.test(username) || RESERVED_USERNAMES.has(username)) return res.json({ available: false, reason: 'invalid' });
  const exists = await User.exists({ username });
  res.json({ available: !exists });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const username = String(req.body.username || '').toLowerCase().trim();
  const fullName = String(req.body.fullName || '').trim();
  const password = String(req.body.password || '');

  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  if (!USERNAME_RE.test(username))
    throw new HttpError(400, 'Usernames must be 3–30 characters: letters, numbers, underscores and periods.');
  if (password.length < 6) throw new HttpError(400, 'Create a password at least 6 characters long.');

  if (await User.exists({ email })) throw new HttpError(409, 'Another account is using this email.');
  if (RESERVED_USERNAMES.has(username) || (await User.exists({ username }))) throw new HttpError(409, "This username isn't available. Please try another.");

  const user = await User.create({ email, username, fullName, password: await bcrypt.hash(password, 10) });
  setAuthCookie(res, user._id);
  res.status(201).json({ user: user.toProfile(user._id) });
});

// POST /api/auth/login  { identifier: username or email, password }
router.post('/login', async (req, res) => {
  const identifier = String(req.body.identifier || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  if (!identifier || !password) throw new HttpError(400, 'Enter your username or email and password.');

  const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new HttpError(401, 'Sorry, your password was incorrect. Please double-check your password.');

  setAuthCookie(res, user._id);
  res.json({ user: user.toProfile(user._id) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me  → the logged-in user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { ...req.user.toProfile(req.user._id), email: req.user.email } });
});

// PUT /api/auth/password  { currentPassword, newPassword }
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(String(currentPassword), user.password)))
    throw new HttpError(400, 'Your current password was entered incorrectly.');
  if (String(newPassword).length < 6) throw new HttpError(400, 'Create a password at least 6 characters long.');
  user.password = await bcrypt.hash(String(newPassword), 10);
  await user.save();
  res.json({ ok: true });
});

module.exports = router;
