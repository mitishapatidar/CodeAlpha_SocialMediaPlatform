import { h, avatar, escapeHtml, toast, userLink } from '../utils.js';
import { store, toggleFollow } from '../store.js';
import { api } from '../api.js';
import { openModal, actionSheet } from './modal.js';
import { icons } from '../icons.js';

/**
 * Follow / Following button. Asks for confirmation before unfollowing.
 * variant: 'button' (filled blue / grey) or 'text' (blue "Follow" link, used in lists & suggestions)
 */
export function followButton(user, { variant = 'button', onChange } = {}) {
  const btn = h('<button type="button"></button>');
  let following = !!user.isFollowing;
  let busy = false;

  const paint = () => {
    if (variant === 'text') {
      btn.className = following ? 'follow-text following' : 'follow-text';
      btn.textContent = following ? 'Following' : 'Follow';
    } else {
      btn.className = `btn ${following ? 'btn-secondary' : 'btn-primary'} follow-btn`;
      btn.textContent = following ? 'Following' : user.followsYou ? 'Follow Back' : 'Follow';
    }
  };
  paint();

  const run = async () => {
    busy = true;
    btn.disabled = true;
    try {
      const res = await toggleFollow(user.username);
      following = res.isFollowing;
      user.isFollowing = following;
      paint();
      onChange?.(res);
    } catch (err) {
      toast(err.message);
    } finally {
      busy = false;
      btn.disabled = false;
    }
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!following) return run();
    actionSheet([{ label: 'Unfollow', danger: true, bold: true, action: run }], {
      image: `<div class="sheet-avatar">${avatar(user, 90)}</div>`,
      subtitle: `Unfollow @${user.username}?`,
    });
  });

  // Stay in sync when the same account is (un)followed elsewhere on the page
  store.watch(btn, 'follow:changed', (d) => {
    if (d.username === user.username && d.isFollowing !== following) {
      following = d.isFollowing;
      user.isFollowing = following;
      paint();
    }
  });

  return btn;
}

/** A row: avatar, username (+ subtitle) and an optional follow button. */
export function userRow(user, { subtitle, size = 44, action = 'follow', onClick } = {}) {
  const row = h(`
    <div class="user-row">
      ${avatar(user, size, { link: true })}
      <div class="user-row-text">
        <div class="user-row-name">${userLink(user)}</div>
        <div class="user-row-sub">${escapeHtml(subtitle ?? user.fullName ?? '')}</div>
      </div>
      <div class="user-row-action"></div>
    </div>`);
  if (action === 'follow' && !user.isMe) row.querySelector('.user-row-action').append(followButton(user, { variant: 'button' }));
  if (onClick) row.addEventListener('click', (e) => !e.target.closest('button') && onClick(e));
  return row;
}

/**
 * Modal listing users (followers, following, likes...).
 * `fetchUsers(q)` must resolve to an array of users.
 */
export function openUserList(title, fetchUsers, { searchable = false, rowExtras } = {}) {
  const body = h(`
    <div class="user-list">
      ${searchable ? `<div class="user-list-search"><input type="search" placeholder="Search" aria-label="Search" /></div>` : ''}
      <div class="user-list-items">${icons.spinner()}</div>
    </div>`);
  const items = body.querySelector('.user-list-items');
  const modal = openModal({ title, body, className: 'modal-list' });

  const load = async (q = '') => {
    try {
      const users = await fetchUsers(q);
      items.innerHTML = '';
      if (!users.length) {
        items.innerHTML = `<p class="empty-small">${q ? 'No results found.' : 'Nobody here yet.'}</p>`;
        return;
      }
      for (const u of users) {
        const row = userRow(u, { onClick: () => modal.close() });
        row.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => modal.close()));
        rowExtras?.(row, u, modal);
        items.append(row);
      }
    } catch (err) {
      items.innerHTML = `<p class="empty-small">${escapeHtml(err.message)}</p>`;
    }
  };

  if (searchable) {
    let t;
    body.querySelector('input').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => load(e.target.value.trim()), 250);
    });
  }
  load();
  return modal;
}

export const showLikes = (postId) =>
  openUserList('Likes', () => api.get(`/posts/${postId}/likes`).then((r) => r.users));
