import { api } from '../api.js';
import { icons } from '../icons.js';
import { store } from '../store.js';
import { h, qs, avatar, userLink, escapeHtml, timeAgo } from '../utils.js';
import { followButton } from '../components/follow.js';
import { openPostModal } from '../components/post.js';

const TEXT = {
  like: 'liked your photo.',
  comment: 'commented:',
  follow: 'started following you.',
  comment_like: 'liked your comment:',
};

function section(items) {
  const now = Date.now();
  const groups = [
    ['Today', (d) => now - d < 864e5],
    ['This week', (d) => now - d < 7 * 864e5],
    ['This month', (d) => now - d < 30 * 864e5],
    ['Earlier', () => true],
  ];
  const out = new Map(groups.map(([n]) => [n, []]));
  for (const n of items) {
    const d = new Date(n.createdAt).getTime();
    out.get(groups.find(([, test]) => test(d))[0]).push(n);
  }
  return [...out].filter(([, list]) => list.length);
}

function row(n) {
  const el = h(`
    <div class="notif ${n.read ? '' : 'unread'}">
      ${avatar(n.sender, 44, { link: true })}
      <p class="notif-text">
        ${userLink(n.sender)} ${TEXT[n.type]}
        ${n.text ? `<span>${escapeHtml(n.text)}</span>` : ''}
        <time>${timeAgo(n.createdAt)}</time>
      </p>
      <div class="notif-side"></div>
    </div>`);
  const side = qs('.notif-side', el);
  if (n.type === 'follow') {
    side.append(followButton(n.sender));
  } else if (n.post) {
    const thumb = h(`<button type="button" class="notif-thumb"><img src="${escapeHtml(n.post.image)}" alt="Post" /></button>`);
    thumb.addEventListener('click', () => openPostModal(n.post._id));
    side.append(thumb);
  }
  return el;
}

export default async function notifications(root) {
  const el = h(`<div class="notifications"><h2 class="page-title">Notifications</h2><div class="notif-list">${icons.spinner()}</div></div>`);
  root.append(el);
  const list = qs('.notif-list', el);
  try {
    const { notifications: items } = await api.get('/notifications');
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = `<div class="profile-empty"><div class="profile-empty-icon">${icons.heart()}</div><h2>Activity on your posts</h2><p>When someone likes or comments on one of your posts, you'll see it here.</p></div>`;
    }
    for (const [name, group] of section(items)) {
      list.append(h(`<h3 class="section-label">${name}</h3>`));
      group.forEach((n) => list.append(row(n)));
    }
    await api.put('/notifications/read');
    store.emit('notifications:read');
  } catch (err) {
    list.innerHTML = `<p class="empty-small">${escapeHtml(err.message)}</p>`;
  }
}
