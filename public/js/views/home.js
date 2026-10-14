import { api } from '../api.js';
import { icons } from '../icons.js';
import { store } from '../store.js';
import { h, qs, avatar, userLink, escapeHtml, onReachEnd } from '../utils.js';
import { postCard } from '../components/post.js';
import { storyTray } from '../components/stories.js';
import { followButton, userRow, openUserList } from '../components/follow.js';

const footerLinks = ['About', 'Help', 'Press', 'API', 'Jobs', 'Privacy', 'Terms', 'Locations', 'Language'];

function suggestionsAside() {
  const me = store.me;
  const el = h(`
    <aside class="home-aside">
      <div class="aside-me">
        ${avatar(me, 44, { link: true })}
        <div class="user-row-text">
          <div class="user-row-name">${userLink(me)}</div>
          <div class="user-row-sub">${escapeHtml(me.fullName)}</div>
        </div>
        <a href="/accounts/edit" class="btn-link small" data-link>Edit</a>
      </div>
      <div class="aside-title"><span>Suggested for you</span><button type="button" class="see-all">See all</button></div>
      <div class="aside-list">${icons.spinner()}</div>
      <footer class="aside-footer">
        <p>${footerLinks.join(' · ')}</p>
        <p>© 2026 INSTACLONE — CODEALPHA</p>
      </footer>
    </aside>`);

  api.get('/users/suggestions?limit=5').then(({ users }) => {
    const list = qs('.aside-list', el);
    list.innerHTML = users.length ? '' : '<p class="empty-small">No suggestions right now.</p>';
    users.forEach((u) => {
      const row = userRow(u, { subtitle: u.reason, size: 44, action: 'none' });
      qs('.user-row-action', row).append(followButton(u, { variant: 'text' }));
      list.append(row);
    });
  });

  qs('.see-all', el).addEventListener('click', () =>
    openUserList('Suggested for you', () => api.get('/users/suggestions?limit=30').then((r) => r.users))
  );
  return el;
}

/** Shown when the feed is empty: a welcome card with people to follow. */
function emptyFeed() {
  const el = h(`
    <div class="feed-empty">
      <div class="feed-empty-icon">${icons.camera()}</div>
      <h2>Welcome to Instaclone</h2>
      <p>When you follow people, you'll see the photos they share here.</p>
      <div class="feed-empty-list">${icons.spinner()}</div>
    </div>`);
  api.get('/users/suggestions?limit=8').then(({ users }) => {
    const list = qs('.feed-empty-list', el);
    list.innerHTML = '';
    users.forEach((u) => list.append(userRow(u, { subtitle: u.reason })));
    if (!users.length) list.innerHTML = '<p class="empty-small">Invite your friends to join!</p>';
  });
  return el;
}

export default function home(root) {
  const page = h(`
    <div class="home">
      <div class="home-main">
        <div class="feed"></div>
        <div class="feed-sentinel"></div>
      </div>
    </div>`);
  root.append(page);
  const main = qs('.home-main', page);
  main.prepend(storyTray());
  page.append(suggestionsAside());

  const feed = qs('.feed', page);
  const sentinel = qs('.feed-sentinel', page);
  let cursor = null;
  let loading = false;
  let done = false;
  let count = 0;

  const load = async () => {
    if (loading || done) return;
    loading = true;
    sentinel.innerHTML = icons.spinner();
    try {
      const { posts, hasMore, nextCursor } = await api.get(`/posts/feed${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`);
      posts.forEach((p) => feed.append(postCard(p)));
      count += posts.length;
      cursor = nextCursor;
      done = !hasMore;
      if (!count) feed.append(emptyFeed());
      else if (done) sentinel.innerHTML = `<div class="caught-up"><span class="caught-up-icon">✓</span><h3>You're all caught up</h3><p>You've seen all new posts.</p></div>`;
    } catch (err) {
      sentinel.innerHTML = `<p class="empty-small">${escapeHtml(err.message)}</p>`;
      done = true;
    } finally {
      loading = false;
    }
    if (!done) {
      sentinel.innerHTML = '';
      if (sentinel.getBoundingClientRect().top < innerHeight + 600) setTimeout(load);
    }
  };

  const disconnect = onReachEnd(sentinel, load);
  load();

  // New posts I share appear at the top of my feed straight away
  const offCreated = store.on('post:created', (e) => {
    qs('.feed-empty', feed)?.remove();
    feed.prepend(postCard(e.detail));
    count += 1;
  });

  return () => {
    disconnect();
    offCreated();
  };
}
