const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'token';
const TOKEN_TTL_DAYS = 7;

function signToken(userId) {
  return jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, { expiresIn: `${TOKEN_TTL_DAYS}d` });
}

function setAuthCookie(res, userId) {
  res.cookie(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

/** Reads the token from the cookie (or an "Authorization: Bearer" header). */
async function loadUser(req) {
  const header = req.headers.authorization || '';
  const token = req.cookies?.[COOKIE_NAME] || (header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(id);
  } catch {
    return null;
  }
}

/** Rejects the request with 401 unless the user is logged in. */
async function requireAuth(req, res, next) {
  const user = await loadUser(req);
  if (!user) return res.status(401).json({ message: 'Please log in to continue.' });
  req.user = user;
  next();
}

/** Attaches req.user when logged in, but lets anonymous requests through. */
async function optionalAuth(req, res, next) {
  req.user = await loadUser(req);
  next();
}

module.exports = { requireAuth, optionalAuth, setAuthCookie, clearAuthCookie };
