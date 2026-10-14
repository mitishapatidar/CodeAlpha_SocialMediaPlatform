import { api } from './api.js';

const DEMO = { identifier: 'demo', password: 'demo123' }; // created by `npm run seed`

const errorEl = document.getElementById('auth-error');
const showError = (msg) => (errorEl.textContent = msg);

// Where to go after logging in (e.g. /login?next=/explore)
const nextUrl = () => {
  const next = new URLSearchParams(location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
};

// Already logged in? Skip the form.
api.get('/auth/me', { redirectOn401: false }).then(() => location.replace(nextUrl())).catch(() => {});

// ---------- Show / hide password ----------
const pwd = document.getElementById('password');
const toggle = document.querySelector('.toggle-password');
pwd.addEventListener('input', () => (toggle.hidden = !pwd.value));
toggle.addEventListener('click', () => {
  const show = pwd.type === 'password';
  pwd.type = show ? 'text' : 'password';
  toggle.textContent = show ? 'Hide' : 'Show';
});

function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.innerHTML = loading ? '<div class="spinner"></div>' : label;
}

// ---------- Login ----------
const loginForm = document.getElementById('login-form');
if (loginForm) {
  const submit = loginForm.querySelector('button[type=submit]');
  const identifier = document.getElementById('identifier');
  const validate = () => (submit.disabled = !(identifier.value.trim() && pwd.value.length >= 1));
  loginForm.addEventListener('input', validate);

  const login = async (creds) => {
    showError('');
    setLoading(submit, true, 'Log in');
    try {
      await api.post('/auth/login', creds, { redirectOn401: false });
      location.replace(nextUrl());
      return true;
    } catch (err) {
      showError(err.message);
      setLoading(submit, false, 'Log in');
      validate();
      return false;
    }
  };

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!submit.disabled) login({ identifier: identifier.value, password: pwd.value });
  });

  document.getElementById('demo-login').addEventListener('click', async () => {
    if (!(await login(DEMO))) showError('Demo account not found — run "npm run seed" first.');
  });

  document.getElementById('forgot-link').addEventListener('click', (e) => {
    e.preventDefault();
    showError('Password reset by email isn\'t available in this demo. Create a new account or use the demo account.');
  });
}

// ---------- Sign up ----------
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  const submit = signupForm.querySelector('button[type=submit]');
  const email = document.getElementById('email');
  const username = document.getElementById('username');
  const status = (name) => signupForm.querySelector(`.field-status[data-for="${name}"]`);
  let usernameOk = false;

  const setStatus = (name, ok) => {
    const el = status(name);
    el.className = `field-status ${ok === null ? '' : ok ? 'ok' : 'bad'}`;
    el.textContent = ok === null ? '' : ok ? '✓' : '✕';
  };

  const validate = () => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    submit.disabled = !(emailOk && usernameOk && pwd.value.length >= 6);
  };

  email.addEventListener('blur', () => setStatus('email', email.value ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) : null));

  // Live username availability check (debounced)
  let timer;
  username.addEventListener('input', () => {
    username.value = username.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    usernameOk = false;
    setStatus('username', null);
    clearTimeout(timer);
    if (username.value.length < 3) return validate();
    timer = setTimeout(async () => {
      const { available } = await api.get(`/auth/check-username?username=${encodeURIComponent(username.value)}`, { redirectOn401: false });
      usernameOk = available;
      setStatus('username', available);
      if (!available) showError("This username isn't available. Please try another.");
      else showError('');
      validate();
    }, 350);
  });

  signupForm.addEventListener('input', validate);
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    showError('');
    setLoading(submit, true, 'Sign up');
    try {
      await api.post('/auth/register', Object.fromEntries(new FormData(signupForm)), { redirectOn401: false });
      location.replace('/');
    } catch (err) {
      showError(err.message);
      setLoading(submit, false, 'Sign up');
      validate();
    }
  });
}
