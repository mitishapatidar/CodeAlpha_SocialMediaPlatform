import { api } from '../api.js';
import { icons } from '../icons.js';
import { h, qs, avatar, escapeHtml, formatCount, debounce, verified } from '../utils.js';
import { postGrid } from '../components/grid.js';

const RECENT_KEY = 'recentSearches';
const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } };
const setRecent = (list) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 15))); } catch {} };
const addRecent = (item) => setRecent([item, ...getRecent().filter((r) => r.key !== item.key)]);

function resultRow(item) {
  if (item.type === 'tag') {
    return `<a href="/explore/tags/${encodeURIComponent(item.name)}" class="search-row" data-key="${escapeHtml(item.key)}" data-link>
      <span class="tag-circle">${icons.hashtag()}</span>
      <span class="user-row-text"><b>#${escapeHtml(item.name)}</b><span class="user-row-sub">${item.count != null ? `${formatCount(item.count)} posts` : ''}</span></span>
      <span class="remove-recent-slot"></span></a>`;
  }
  return `<a href="/${escapeHtml(item.username)}" class="search-row" data-key="${escapeHtml(item.key)}" data-link>
    ${avatar(item, 44)}
    <span class="user-row-text"><b>${escapeHtml(item.username)}${verified(item)}</b>
    <span class="user-row-sub">${escapeHtml(item.fullName || '')}${item.isFollowing ? ' • Following' : item.followersCount != null ? ` • ${formatCount(item.followersCount)} followers` : ''}</span></span>
    <span class="remove-recent-slot"></span></a>`;
}

export default function explore(root) {
  const el = h(`
    <div class="explore">
      <div class="search-bar">
        <span class="search-icon">${icons.search()}</span>
        <input type="search" placeholder="Search" aria-label="Search users and hashtags" autocomplete="off" />
        <button type="button" class="search-cancel" hidden>Cancel</button>
      </div>
      <div class="search-results" hidden></div>
      <div class="explore-grid"></div>
    </div>`);
  root.append(el);

  const input = qs('input', el);
  const results = qs('.search-results', el);
  const gridWrap = qs('.explore-grid', el);
  const cancel = qs('.search-cancel', el);
  const grid = postGrid((page) => api.get(`/posts/explore?page=${page}`), {
    empty: '<div class="profile-empty"><h2>Nothing to explore yet</h2><p>Posts from other people will show up here.</p></div>',
    className: 'explore-layout',
  });
  gridWrap.append(grid.el);

  const showRecent = () => {
    const recent = getRecent();
    results.innerHTML = `
      <div class="recent-head"><b>Recent</b>${recent.length ? '<button type="button" class="btn-link clear-all">Clear all</button>' : ''}</div>
      ${recent.length ? recent.map(resultRow).join('') : '<p class="empty-small">No recent searches.</p>'}`;
    results.querySelectorAll('.remove-recent-slot').forEach((slot) => {
      slot.innerHTML = `<button type="button" class="icon-btn remove-recent" aria-label="Remove">${icons.close()}</button>`;
    });
  };

  let lastItems = [];
  const search = debounce(async (q) => {
    if (!q) return showRecent();
    try {
      const { users, tags } = await api.get(`/search?q=${encodeURIComponent(q)}`);
      if (input.value.trim() !== q) return;
      lastItems = [
        ...users.map((u) => ({ ...u, type: 'user', key: `u:${u.username}` })),
        ...tags.map((t) => ({ ...t, type: 'tag', key: `t:${t.name}` })),
      ];
      results.innerHTML = lastItems.length ? lastItems.map(resultRow).join('') : '<p class="empty-small">No results found.</p>';
    } catch (err) {
      results.innerHTML = `<p class="empty-small">${escapeHtml(err.message)}</p>`;
    }
  }, 250);

  const open = (on) => {
    results.hidden = !on;
    gridWrap.hidden = on;
    cancel.hidden = !on;
  };

  input.addEventListener('focus', () => {
    open(true);
    if (!input.value.trim()) showRecent();
  });
  input.addEventListener('input', () => search(input.value.trim()));
  cancel.addEventListener('click', () => {
    input.value = '';
    open(false);
  });

  results.addEventListener('click', (e) => {
    if (e.target.closest('.clear-all')) {
      setRecent([]);
      return showRecent();
    }
    const rm = e.target.closest('.remove-recent');
    const row = e.target.closest('.search-row');
    if (rm && row) {
      e.preventDefault();
      e.stopPropagation();
      setRecent(getRecent().filter((r) => r.key !== row.dataset.key));
      return showRecent();
    }
    if (row) {
      const item = lastItems.find((i) => i.key === row.dataset.key);
      if (item) addRecent(item);
    }
  });

  if (new URLSearchParams(location.search).has('search')) setTimeout(() => input.focus());
  return () => grid.destroy();
}

export function tagPage(root, { tag }) {
  const el = h(`
    <div class="tag-page">
      <header class="tag-header">
        <span class="tag-big">${icons.hashtag()}</span>
        <div><h2>#${escapeHtml(tag)}</h2><p class="tag-count"></p></div>
      </header>
      <h3 class="section-label">Top posts</h3>
    </div>`);
  root.append(el);
  const grid = postGrid(async (page) => {
    const r = await api.get(`/posts/tag/${encodeURIComponent(tag)}?page=${page}`);
    qs('.tag-count', el).innerHTML = `<b>${formatCount(r.total)}</b> ${r.total === 1 ? 'post' : 'posts'}`;
    return r;
  }, { empty: '<div class="profile-empty"><h2>No posts yet</h2><p>Be the first to use this hashtag.</p></div>' });
  el.append(grid.el);
  document.title = `#${tag} • Instaclone`;
  return () => grid.destroy();
}
