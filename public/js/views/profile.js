import { api } from '../api.js';
import { icons } from '../icons.js';
import { store } from '../store.js';
import { h, qs, qsa, avatar, escapeHtml, linkify, formatCount, toast, copyToClipboard, verified } from '../utils.js';
import { navigate } from '../router.js';
import { postGrid } from '../components/grid.js';
import { followButton, openUserList } from '../components/follow.js';
import { actionSheet } from '../components/modal.js';
import { openCreatePost } from '../components/create.js';
import { openUserStories, uploadStory } from '../components/stories.js';

export function notFoundPage(root) {
  root.append(h(`
    <div class="not-found">
      <h2>Sorry, this page isn't available.</h2>
      <p>The link you followed may be broken, or the page may have been removed. <a href="/" data-link>Go back to Instaclone.</a></p>
    </div>`));
}

/** Change / remove profile photo (used here and on the edit-profile page). */
export function changeAvatarSheet(onChange) {
  const pick = () => {
    const input = h('<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden />');
    input.addEventListener('change', async () => {
      const file = input.files[0];
      input.remove();
      if (!file) return;
      const fd = new FormData();
      fd.append('avatar', file);
      try {
        const { avatar: url } = await api.put('/users/me/avatar', fd);
        store.setMe({ avatar: url });
        onChange?.(url);
        toast('Profile photo added.');
      } catch (err) {
        toast(err.message);
      }
    });
    document.body.append(input);
    input.click();
  };
  const remove = async () => {
    try {
      await api.del('/users/me/avatar');
      store.setMe({ avatar: '' });
      onChange?.('');
      toast('Profile photo removed.');
    } catch (err) {
      toast(err.message);
    }
  };
  if (!store.me.avatar) return pick();
  actionSheet(
    [
      { label: 'Upload photo', bold: true, action: pick, className: 'primary' },
      { label: 'Remove current photo', danger: true, bold: true, action: remove },
    ],
    { title: 'Change profile photo' }
  );
}

export default async function profile(root, { username, tab = 'posts' }) {
  root.innerHTML = icons.spinner();
  let user;
  let hasStory = false;
  try {
    [{ user }, { stories: hasStory }] = await Promise.all([
      api.get(`/users/${encodeURIComponent(username)}`),
      api.get(`/stories/user/${encodeURIComponent(username)}`).then((r) => ({ stories: r.stories.length > 0 })).catch(() => ({ stories: false })),
    ]);
  } catch (err) {
    root.innerHTML = '';
    if (err.status === 404) return notFoundPage(root);
    root.innerHTML = `<p class="empty-small">${escapeHtml(err.message)}</p>`;
    return;
  }
  root.innerHTML = '';
  document.title = `${user.fullName ? `${user.fullName} (@${user.username})` : `@${user.username}`} • Instaclone`;
  if (user.isMe && tab === 'saved') tab = 'saved';
  else tab = 'posts';

  const el = h(`
    <div class="profile">
      <div class="profile-topbar mobile-only">
        <span class="profile-topbar-name">${escapeHtml(user.username)}${verified(user)}</span>
        ${user.isMe ? `<a href="/accounts/edit" class="icon-btn" data-link aria-label="Settings">${icons.menu()}</a>` : ''}
      </div>

      <header class="profile-header">
        <div class="profile-avatar">
          <button type="button" class="profile-avatar-btn" aria-label="${user.isMe ? 'Change profile photo' : 'Profile picture'}">
            ${avatar(user, 150, { ring: hasStory ? 'unseen' : false })}
          </button>
          ${user.isMe ? `<button type="button" class="profile-avatar-add" aria-label="Add to story">${icons.plus()}</button>` : ''}
        </div>
        <section class="profile-info">
          <div class="profile-row-name">
            <h2>${escapeHtml(user.username)}</h2>${verified(user)}
            <div class="profile-actions"></div>
          </div>
          <ul class="profile-stats">
            <li><b>${formatCount(user.postsCount)}</b> ${user.postsCount === 1 ? 'post' : 'posts'}</li>
            <li><button type="button" class="followers-link"><b class="followers-count">${formatCount(user.followersCount)}</b> ${user.followersCount === 1 ? 'follower' : 'followers'}</button></li>
            <li><button type="button" class="following-link"><b>${formatCount(user.followingCount)}</b> following</button></li>
          </ul>
          <div class="profile-bio">
            ${user.fullName ? `<b class="profile-fullname">${escapeHtml(user.fullName)}</b>` : ''}
            ${user.bio ? `<p>${linkify(user.bio)}</p>` : ''}
            ${user.website ? `<a class="profile-website" href="${escapeHtml(/^https?:\/\//.test(user.website) ? user.website : `https://${user.website}`)}" target="_blank" rel="noopener noreferrer nofollow" data-external>${icons.link()} ${escapeHtml(user.website.replace(/^https?:\/\//, ''))}</a>` : ''}
            ${!user.isMe && user.followsYou ? '<span class="follows-you">Follows you</span>' : ''}
          </div>
        </section>
      </header>

      <div class="profile-actions-mobile mobile-only"></div>

      <nav class="profile-tabs" role="tablist">
        <a href="/${escapeHtml(user.username)}" class="${tab === 'posts' ? 'active' : ''}" role="tab" data-link>${icons.grid()}<span>Posts</span></a>
        ${user.isMe ? `<a href="/${escapeHtml(user.username)}/saved" class="${tab === 'saved' ? 'active' : ''}" role="tab" data-link>${icons.bookmarkSmall()}<span>Saved</span></a>` : ''}
        <a href="#" class="tagged-tab" role="tab">${icons.tagged()}<span>Tagged</span></a>
      </nav>
      <div class="profile-content"></div>
    </div>`);
  root.append(el);

  // ---------- Action buttons ----------
  const buildActions = () => {
    const wrap = h('<div class="profile-btns"></div>');
    if (user.isMe) {
      wrap.append(
        h('<a href="/accounts/edit" class="btn btn-secondary" data-link>Edit profile</a>'),
        h('<button type="button" class="btn btn-secondary share-profile">Share profile</button>')
      );
      qs('.share-profile', wrap).addEventListener('click', () => copyToClipboard(`${location.origin}/${user.username}`));
    } else {
      const fb = followButton(user, {
        onChange: (r) => {
          user.followersCount = r.followersCount;
          qsa('.followers-count', el).forEach((n) => (n.textContent = formatCount(r.followersCount)));
        },
      });
      wrap.append(fb, h('<button type="button" class="btn btn-secondary share-profile">Share profile</button>'));
      qs('.share-profile', wrap).addEventListener('click', () => copyToClipboard(`${location.origin}/${user.username}`));
    }
    return wrap;
  };
  qs('.profile-actions', el).append(buildActions());
  qs('.profile-actions-mobile', el).append(buildActions());
  if (user.isMe) {
    const gear = h(`<a href="/accounts/edit" class="icon-btn desktop-only" data-link aria-label="Settings">${icons.settings()}</a>`);
    qs('.profile-actions', el).append(gear);
  }

  // ---------- Avatar ----------
  qs('.profile-avatar-btn', el).addEventListener('click', async () => {
    if (hasStory) {
      const opened = await openUserStories(user.username);
      if (opened) return;
    }
    if (user.isMe) {
      changeAvatarSheet((url) => {
        qsa('.profile-avatar img.avatar', el).forEach((img) => (img.src = url || '/img/default-avatar.svg'));
      });
    }
  });
  qs('.profile-avatar-add', el)?.addEventListener('click', () => uploadStory(() => navigate(location.pathname)));

  // ---------- Followers / following ----------
  const listFor = (kind) => () =>
    openUserList(kind === 'followers' ? 'Followers' : 'Following', (q) =>
      api.get(`/users/${encodeURIComponent(user.username)}/${kind}${q ? `?q=${encodeURIComponent(q)}` : ''}`).then((r) => r.users),
      {
        searchable: true,
        // On my own followers list, add Instagram's "Remove" button
        rowExtras: user.isMe && kind === 'followers'
          ? (row, u) => {
              const btn = h('<button type="button" class="btn btn-secondary">Remove</button>');
              btn.addEventListener('click', () =>
                actionSheet([{ label: 'Remove', danger: true, bold: true, action: async () => {
                  await api.del(`/users/${encodeURIComponent(u.username)}/follower`);
                  row.remove();
                  user.followersCount -= 1;
                  qsa('.followers-count', el).forEach((n) => (n.textContent = formatCount(user.followersCount)));
                } }], { title: 'Remove follower?', subtitle: `We won't tell ${u.username} they were removed from your followers.` })
              );
              const action = qs('.user-row-action', row);
              action.innerHTML = '';
              action.append(btn);
            }
          : undefined,
      });
  qs('.followers-link', el).addEventListener('click', listFor('followers'));
  qs('.following-link', el).addEventListener('click', listFor('following'));

  // ---------- Tabs ----------
  const content = qs('.profile-content', el);
  qs('.tagged-tab', el).addEventListener('click', (e) => {
    e.preventDefault();
    qsa('.profile-tabs a', el).forEach((a) => a.classList.toggle('active', a === e.currentTarget));
    grid?.destroy();
    grid = null;
    content.innerHTML = `
      <div class="profile-empty">
        <div class="profile-empty-icon">${icons.camera()}</div>
        <h2>Photos of ${user.isMe ? 'you' : escapeHtml(user.username)}</h2>
        <p>When people tag ${user.isMe ? 'you' : 'them'} in photos, they'll appear here.</p>
      </div>`;
  });

  let grid;
  if (tab === 'saved') {
    grid = postGrid(() => api.get(`/users/${encodeURIComponent(user.username)}/saved`), {
      empty: `
        <div class="profile-empty">
          <div class="profile-empty-icon">${icons.bookmark()}</div>
          <h2>Save</h2>
          <p>Save photos that you want to see again. No one is notified, and only you can see what you've saved.</p>
        </div>`,
    });
  } else {
    grid = postGrid((page) => api.get(`/users/${encodeURIComponent(user.username)}/posts?page=${page}`), {
      empty: user.isMe
        ? `<div class="profile-empty">
             <div class="profile-empty-icon">${icons.camera()}</div>
             <h2>Share photos</h2>
             <p>When you share photos, they will appear on your profile.</p>
             <button type="button" class="btn-link share-first">Share your first photo</button>
           </div>`
        : `<div class="profile-empty">
             <div class="profile-empty-icon">${icons.camera()}</div>
             <h2>No posts yet</h2>
           </div>`,
    });
  }
  content.append(grid.el);
  content.addEventListener('click', (e) => e.target.closest('.share-first') && openCreatePost());

  const offCreated = store.on('post:created', (e) => {
    if (!user.isMe || tab !== 'posts') return;
    if (qs('.profile-empty', content)) navigate(location.pathname);
    else grid?.prepend(e.detail);
  });

  return () => {
    grid?.destroy();
    offCreated();
  };
}
