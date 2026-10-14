import { api } from './api.js';
import { icons } from './icons.js';
import { store } from './store.js';
import { qs, qsa, avatar, toast } from './utils.js';
import { defineRoutes, startRouter, match, navigate } from './router.js';
import { closeAllModals, actionSheet } from './components/modal.js';
import { openCreatePost } from './components/create.js';
import home from './views/home.js';
import explore, { tagPage } from './views/explore.js';
import notifications from './views/notifications.js';
import editProfile from './views/editProfile.js';
import postPage from './views/postPage.js';
import profile, { notFoundPage } from './views/profile.js';

const view = qs('#view');
let cleanup = null;

// ---------- Theme ----------
const theme = () => document.documentElement.dataset.theme || 'dark';
function toggleTheme() {
  const next = theme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
}

async function logout() {
  await api.post('/auth/logout');
  location.href = '/login';
}

// ---------- Navigation chrome ----------
function renderChrome() {
  const me = store.me;
  const item = (key, href, icon, label, extra = '') =>
    `<a href="${href}" class="nav-item" data-nav="${key}" data-link>${icon}<span class="nav-label">${label}</span>${extra}</a>`;
  const badge = '<span class="nav-badge" hidden></span>';

  qs('.sidebar').innerHTML = `
    <a href="/" class="sidebar-logo" data-link aria-label="Instaclone home">
      <span class="wordmark">Instaclone</span>
      <img src="/img/logo.svg" alt="" class="logo-icon" />
    </a>
    <div class="nav-items">
      ${item('home', '/', icons.home(), 'Home')}
      ${item('search', '/explore?search', icons.search(), 'Search')}
      ${item('explore', '/explore', icons.explore(), 'Explore')}
      ${item('notifications', '/notifications', icons.heart(), 'Notifications', badge)}
      <button type="button" class="nav-item create-btn">${icons.create()}<span class="nav-label">Create</span></button>
      ${item('profile', `/${me.username}`, avatar(me, 24), 'Profile')}
    </div>
    <button type="button" class="nav-item more-btn">${icons.menu()}<span class="nav-label">More</span></button>`;

  qs('.topbar').innerHTML = `
    <button type="button" class="icon-btn create-btn" aria-label="New post">${icons.plus()}</button>
    <a href="/" class="wordmark" data-link>Instaclone</a>
    <a href="/notifications" class="icon-btn notif-top" data-link aria-label="Notifications">${icons.heart()}${badge}</a>`;

  qs('.bottom-nav').innerHTML = `
    ${item('home', '/', icons.home(), 'Home')}
    ${item('explore', '/explore', icons.search(), 'Search')}
    <button type="button" class="nav-item create-btn" aria-label="New post">${icons.create()}</button>
    ${item('notifications', '/notifications', icons.heart(), 'Notifications', badge)}
    ${item('profile', `/${me.username}`, avatar(me, 26), 'Profile')}`;

  qsa('.create-btn').forEach((b) => b.addEventListener('click', openCreatePost));
  qs('.more-btn').addEventListener('click', () =>
    actionSheet([
      { label: 'Settings', action: () => navigate('/accounts/edit') },
      { label: 'Saved', action: () => navigate(`/${store.me.username}/saved`) },
      { label: `Switch appearance (${theme() === 'dark' ? 'Light' : 'Dark'})`, action: toggleTheme },
      { label: 'Log out', danger: true, action: logout },
    ])
  );
  highlightNav();
  refreshBadge();
}

function highlightNav() {
  const p = location.pathname;
  let key = '';
  if (p === '/') key = 'home';
  else if (p.startsWith('/explore')) key = location.search.includes('search') ? 'search' : 'explore';
  else if (p === '/notifications') key = 'notifications';
  else if (store.me && (p === `/${store.me.username}` || p.startsWith(`/${store.me.username}/`))) key = 'profile';

  qsa('[data-nav]').forEach((a) => {
    const active = a.dataset.nav === key || (key === 'search' && a.dataset.nav === 'explore' && a.closest('.bottom-nav'));
    a.classList.toggle('active', !!active);
    const n = a.dataset.nav;
    const icon = a.querySelector('svg.icon');
    if (icon && icons[n === 'notifications' ? 'heart' : n] && n !== 'profile' && n !== 'search') {
      icon.outerHTML = (n === 'notifications' ? icons.heart : icons[n])(!!active);
    }
  });
  document.body.dataset.page = key || 'other';
}

async function refreshBadge() {
  try {
    const { count } = await api.get('/notifications/unread-count');
    qsa('.nav-badge').forEach((b) => {
      b.hidden = !count;
      b.textContent = count > 9 ? '9+' : count;
    });
  } catch {}
}
store.on('notifications:read', refreshBadge);
setInterval(refreshBadge, 30000);

store.on('me:changed', () => {
  // Update avatars in the nav when the profile photo changes
  qsa('[data-nav=profile] img.avatar').forEach((img) => (img.src = store.me.avatar || '/img/default-avatar.svg'));
  qsa('[data-nav=profile]').forEach((a) => a.setAttribute('href', `/${store.me.username}`));
});

// Phone-only header with a back arrow on inner pages, like Instagram's app
const MOBILE_TITLES = [
  [/^\/p\//, 'Post'],
  [/^\/notifications$/, 'Notifications'],
  [/^\/accounts\/edit$/, 'Edit profile'],
  [/^\/explore\/tags\//, 'Hashtag'],
];
function mobileHeader(path) {
  const title = MOBILE_TITLES.find(([re]) => re.test(path))?.[1];
  if (!title) return;
  const bar = document.createElement('div');
  bar.className = 'mobile-header mobile-only';
  bar.innerHTML = `<button type="button" class="icon-btn" aria-label="Back">${icons.back()}</button><h1>${title}</h1><span></span>`;
  bar.querySelector('button').addEventListener('click', () => (history.length > 1 ? history.back() : navigate('/')));
  view.append(bar);
}

// ---------- Routing ----------
defineRoutes(
  [
    ['/', home],
    ['/explore', explore],
    ['/explore/tags/:tag', tagPage],
    ['/notifications', notifications],
    ['/accounts/edit', editProfile],
    ['/p/:id', postPage],
    ['/:username', profile],
    ['/:username/saved', profile, { tab: 'saved' }],
  ],
  async (path) => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    closeAllModals();
    qs('.story-viewer')?.remove();
    document.body.classList.remove('no-scroll');
    document.title = 'Instaclone';
    view.innerHTML = '';
    window.scrollTo(0, 0);
    highlightNav();
    const route = match(path);
    if (!route) return notFoundPage(view);
    mobileHeader(path);
    try {
      cleanup = await route.view(view, route.params);
    } catch (err) {
      console.error(err);
      toast(err.message);
    }
  }
);

// ---------- Boot ----------
(async function boot() {
  try {
    const { user } = await api.get('/auth/me');
    const { user: full } = await api.get(`/users/${user.username}`);
    store.setMe({ ...user, postsCount: full.postsCount });
  } catch {
    return; // api.js already redirected to /login
  }
  renderChrome();
  startRouter();
})();

// Keyboard shortcut: "n" opens the create dialog
document.addEventListener('keydown', (e) => {
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !qs('.modal-backdrop')) openCreatePost();
});

