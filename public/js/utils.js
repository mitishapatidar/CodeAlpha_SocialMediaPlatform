import { icons } from './icons.js';

export const DEFAULT_AVATAR = '/img/default-avatar.svg';

export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Builds a DOM element from an HTML string. */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** "1,234" below 10k, then "12.5K", "1.2M" — like Instagram. */
export function formatCount(n = 0) {
  if (n < 10000) return n.toLocaleString('en-US');
  if (n < 1e6) return `${+(n / 1e3).toFixed(1)}K`;
  return `${+(n / 1e6).toFixed(1)}M`;
}

export const plural = (n, word, pluralWord = `${word}s`) => `${formatCount(n)} ${n === 1 ? word : pluralWord}`;

const UNITS = [
  ['y', 'year', 365 * 864e5],
  ['w', 'week', 7 * 864e5],
  ['d', 'day', 864e5],
  ['h', 'hour', 36e5],
  ['m', 'minute', 6e4],
  ['s', 'second', 1e3],
];

/** "3h" (short) or "3 hours ago" (long). Older than a week shows a date in long mode. */
export function timeAgo(date, long = false) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60e3) return long ? 'Just now' : 'now';
  if (long && diff > 7 * 864e5) {
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: diff > 365 * 864e5 ? 'numeric' : undefined });
  }
  for (const [short, word, ms] of UNITS) {
    const v = Math.floor(diff / ms);
    if (v >= 1) return long ? `${v} ${word}${v > 1 ? 's' : ''} ago` : `${v}${short}`;
  }
  return 'now';
}

export const avatarUrl = (user) => user?.avatar || DEFAULT_AVATAR;

/**
 * Avatar markup. `ring`: 'unseen' (gradient story ring), 'seen' (grey ring) or false.
 */
export function avatar(user, size = 32, { ring = false, link = false } = {}) {
  const img = `<img class="avatar" src="${escapeHtml(avatarUrl(user))}" alt="${escapeHtml(user?.username || '')}'s profile picture" width="${size}" height="${size}" style="width:${size}px;height:${size}px" loading="lazy" />`;
  const inner = ring ? `<span class="avatar-ring ${ring}">${img}</span>` : img;
  return link && user ? `<a href="/${escapeHtml(user.username)}" class="avatar-link" data-link>${inner}</a>` : inner;
}

export const verified = (user) => (user?.isVerified ? icons.verified() : '');

/** Username link with optional verified badge. */
export const userLink = (user, cls = '') =>
  `<a href="/${escapeHtml(user.username)}" class="username ${cls}" data-link>${escapeHtml(user.username)}</a>${verified(user)}`;

/** Escapes text and turns #hashtags and @mentions into links, keeping line breaks. */
export function linkify(text = '') {
  return escapeHtml(text)
    .replace(/(^|\s)#([\p{L}\p{N}_]+)/gu, (m, pre, tag) => `${pre}<a class="tag" href="/explore/tags/${encodeURIComponent(tag.toLowerCase())}" data-link>#${tag}</a>`)
    .replace(/(^|\s)@([a-z0-9._]{1,30})/gi, (m, pre, u) => `${pre}<a class="tag" href="/${u.toLowerCase()}" data-link>@${u}</a>`)
    .replace(/\n/g, '<br>');
}

let toastTimer;
export function toast(message) {
  let el = qs('.toast');
  if (!el) {
    el = h('<div class="toast" role="status" aria-live="polite"></div>');
    document.body.append(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Link copied to clipboard.');
  } catch {
    toast(text);
  }
}

/** Calls `load` whenever `sentinel` scrolls into view (infinite scroll). Returns a disconnect fn. */
export function onReachEnd(sentinel, load) {
  const io = new IntersectionObserver((entries) => entries[0].isIntersecting && load(), { rootMargin: '600px' });
  io.observe(sentinel);
  return () => io.disconnect();
}
