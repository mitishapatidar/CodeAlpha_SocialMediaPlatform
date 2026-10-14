import { h, escapeHtml, formatCount, onReachEnd } from '../utils.js';
import { icons } from '../icons.js';
import { store } from '../store.js';
import { openPostModal } from './post.js';

function tile(rawPost) {
  const post = store.upsertPost(rawPost);
  const el = h(`
    <a class="grid-tile" href="/p/${post._id}">
      <img src="${escapeHtml(post.images[0])}" alt="${escapeHtml(post.caption.slice(0, 100) || `Post by ${post.author.username}`)}" loading="lazy" />
      ${post.images.length > 1 ? `<span class="grid-badge">${icons.copies()}</span>` : ''}
      <span class="grid-overlay">
        ${post.hideLikes && !post.isMine ? '' : `<span>${icons.heart(true)} <b class="likes"></b></span>`}
        ${post.commentsOff ? '' : `<span>${icons.comment()} <b class="comments"></b></span>`}
      </span>
    </a>`);
  const paint = () => {
    const l = el.querySelector('.likes');
    const c = el.querySelector('.comments');
    if (l) l.textContent = formatCount(post.likesCount);
    if (c) c.textContent = formatCount(post.commentsCount);
  };
  paint();
  el.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    openPostModal(post);
  });
  store.watch(el, 'post:changed', (p) => p._id === post._id && paint());
  store.watch(el, 'post:deleted', (p) => p._id === post._id && el.remove());
  return el;
}

/**
 * Infinite 3-column photo grid.
 * `fetchPage(page)` resolves to { posts, hasMore }. `empty` is HTML shown when there are no posts.
 * Returns { el, destroy }.
 */
export function postGrid(fetchPage, { empty = '', className = '' } = {}) {
  const el = h(`<div class="grid-wrap"><div class="post-grid ${className}"></div><div class="grid-sentinel"></div></div>`);
  const grid = el.querySelector('.post-grid');
  const sentinel = el.querySelector('.grid-sentinel');
  let page = 1;
  let loading = false;
  let done = false;
  let disconnect = () => {};

  const load = async () => {
    if (loading || done) return;
    loading = true;
    sentinel.innerHTML = icons.spinner();
    try {
      const { posts, hasMore } = await fetchPage(page);
      posts.forEach((p) => grid.append(tile(p)));
      page += 1;
      done = !hasMore;
      if (page === 2 && !posts.length && empty) el.innerHTML = empty;
    } catch (err) {
      done = true;
      sentinel.innerHTML = `<p class="empty-small">${escapeHtml(err.message)}</p>`;
      return;
    } finally {
      loading = false;
    }
    sentinel.innerHTML = '';
    if (done) disconnect();
    // The observer only fires on changes, so keep loading while the end is still visible
    else if (sentinel.isConnected && sentinel.getBoundingClientRect().top < innerHeight + 600) setTimeout(load);
  };

  disconnect = onReachEnd(sentinel, load);
  load();
  return { el, destroy: () => disconnect(), prepend: (post) => grid.prepend(tile(post)) };
}
