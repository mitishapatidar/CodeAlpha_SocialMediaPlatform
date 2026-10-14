import { api } from '../api.js';
import { icons } from '../icons.js';
import { store } from '../store.js';
import { h, qs, avatar, escapeHtml, timeAgo, toast, verified } from '../utils.js';
import { actionSheet } from './modal.js';
import { openUserList } from './follow.js';

const STORY_MS = 5000;

/** Picks a photo and posts it as a 24-hour story. */
export function uploadStory(onDone) {
  const input = h('<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden />');
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.remove();
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    toast('Adding to your story…');
    try {
      await api.post('/stories', fd);
      toast('Added to your story.');
      store.emit('stories:changed');
      onDone?.();
    } catch (err) {
      toast(err.message);
    }
  });
  document.body.append(input);
  input.click();
}

/** The horizontal row of story circles on the home page. */
export function storyTray() {
  const el = h(`<div class="story-tray" role="list"><div class="story-skeletons">${'<span></span>'.repeat(6)}</div></div>`);

  const render = async () => {
    let data;
    try {
      data = await api.get('/stories');
    } catch {
      el.innerHTML = '';
      return;
    }
    const { tray, me } = data;
    el.innerHTML = '';

    // "Your story" bubble
    const mine = tray.find((g) => g.isMe);
    const meBubble = h(`
      <button class="story-bubble me" role="listitem">
        <span class="story-avatar">
          ${avatar(me, 66, { ring: mine ? (mine.hasUnseen ? 'unseen' : 'seen') : false })}
          ${mine ? '' : `<span class="story-add" aria-hidden="true">${icons.plus()}</span>`}
        </span>
        <span class="story-name">Your story</span>
      </button>`);
    meBubble.addEventListener('click', () => (mine ? openStoryViewer(tray, tray.indexOf(mine)) : uploadStory()));
    el.append(meBubble);

    tray.filter((g) => !g.isMe).forEach((g) => {
      const b = h(`
        <button class="story-bubble" role="listitem">
          <span class="story-avatar">${avatar(g.user, 66, { ring: g.hasUnseen ? 'unseen' : 'seen' })}</span>
          <span class="story-name">${escapeHtml(g.user.username)}</span>
        </button>`);
      b.addEventListener('click', () => openStoryViewer(tray, tray.indexOf(g)));
      el.append(b);
    });
  };

  render();
  store.watch(el, 'stories:changed', render);
  return el;
}

/**
 * Full-screen story viewer. Plays every story of tray[groupIndex], then moves on
 * to the next person's stories, like Instagram.
 */
export function openStoryViewer(tray, groupIndex = 0, { single = false } = {}) {
  let g = groupIndex;
  let s = 0;
  let timer = null;
  let started = 0;
  let elapsed = 0;
  let paused = false;
  let changed = false;

  const el = h(`
    <div class="story-viewer" role="dialog" aria-modal="true" aria-label="Stories">
      <div class="story-brand wordmark">Instaclone</div>
      <button class="story-close" aria-label="Close">${icons.close()}</button>
      <div class="story-stage">
        <div class="story-frame">
          <div class="story-progress"></div>
          <div class="story-head"></div>
          <img class="story-img" alt="" />
          <button class="story-nav prev" aria-label="Previous story"></button>
          <button class="story-nav next" aria-label="Next story"></button>
          <div class="story-foot"></div>
        </div>
      </div>
    </div>`);

  const progress = qs('.story-progress', el);
  const head = qs('.story-head', el);
  const img = qs('.story-img', el);
  const foot = qs('.story-foot', el);

  const close = () => {
    clearTimeout(timer);
    el.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    if (changed) store.emit('stories:changed');
  };

  const group = () => tray[g];
  const story = () => group().stories[s];

  function schedule(ms) {
    clearTimeout(timer);
    started = Date.now();
    timer = setTimeout(next, ms);
  }

  function show() {
    const grp = group();
    const st = story();
    elapsed = 0;
    paused = false;
    el.classList.remove('paused');

    progress.innerHTML = grp.stories.map((_, i) => `<span><i class="${i < s ? 'done' : ''}"></i></span>`).join('');
    const bar = progress.children[s].firstElementChild;
    bar.style.animationDuration = `${STORY_MS}ms`;
    bar.classList.add('running');

    head.innerHTML = `
      <a href="/${escapeHtml(grp.user.username)}" class="story-user" data-link>
        ${avatar(grp.user, 32)}
        <b>${escapeHtml(grp.user.username)}</b>${verified(grp.user)}
        <span class="story-time">${timeAgo(st.createdAt)}</span>
      </a>
      ${grp.isMe ? `<button class="story-more" aria-label="Story options">${icons.more()}</button>` : ''}`;
    qs('.story-user', head).addEventListener('click', close);
    qs('.story-more', head)?.addEventListener('click', (e) => {
      e.stopPropagation();
      pause();
      actionSheet([{ label: 'Delete', danger: true, bold: true, action: () => deleteCurrent() }], {
        onClose: () => setTimeout(() => el.isConnected && resume()),
      });
    });

    foot.innerHTML = grp.isMe
      ? `<button class="story-viewers">👁 ${st.viewersCount || 0} viewer${st.viewersCount === 1 ? '' : 's'}</button>`
      : `<div class="story-reply">Reply to ${escapeHtml(grp.user.username)}…</div><span class="story-heart">${icons.heart()}</span>`;
    qs('.story-viewers', foot)?.addEventListener('click', (e) => {
      e.stopPropagation();
      pause();
      const m = openUserList('Viewers', () => api.get(`/stories/${st._id}/viewers`).then((r) => r.users));
      const off = new MutationObserver(() => {
        if (!m.backdrop.isConnected) { off.disconnect(); if (el.isConnected) resume(); }
      });
      off.observe(document.body, { childList: true });
    });

    img.src = st.image;
    img.alt = `Story by ${grp.user.username}`;
    schedule(STORY_MS);

    if (!st.seen && !grp.isMe) {
      st.seen = true;
      changed = true;
      api.post(`/stories/${st._id}/view`).catch(() => {});
      grp.hasUnseen = grp.stories.some((x) => !x.seen);
    }
  }

  function next() {
    if (s < group().stories.length - 1) s += 1;
    else if (!single && g < tray.length - 1) { g += 1; s = 0; }
    else return close();
    show();
  }

  function prev() {
    if (s > 0) s -= 1;
    else if (!single && g > 0) { g -= 1; s = 0; }
    show();
  }

  function pause() {
    if (paused) return;
    paused = true;
    elapsed += Date.now() - started;
    clearTimeout(timer);
    el.classList.add('paused');
  }

  function resume() {
    if (!paused) return;
    paused = false;
    el.classList.remove('paused');
    schedule(Math.max(STORY_MS - elapsed, 0));
  }

  async function deleteCurrent() {
    const st = story();
    try {
      await api.del(`/stories/${st._id}`);
      changed = true;
      group().stories.splice(s, 1);
      toast('Story deleted.');
      if (!group().stories.length) return close();
      if (s >= group().stories.length) s = group().stories.length - 1;
      show();
    } catch (err) {
      toast(err.message);
    }
  }

  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === ' ') { e.preventDefault(); paused ? resume() : pause(); }
  };

  qs('.story-close', el).addEventListener('click', close);
  qs('.story-nav.next', el).addEventListener('click', next);
  qs('.story-nav.prev', el).addEventListener('click', prev);
  // Hold to pause
  const frame = qs('.story-frame', el);
  let holdTimer;
  frame.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a')) return;
    holdTimer = setTimeout(pause, 200);
  });
  frame.addEventListener('pointerup', () => {
    clearTimeout(holdTimer);
    if (paused && !document.querySelector('.modal-backdrop')) setTimeout(resume, 0);
  });
  el.addEventListener('click', (e) => e.target === el && close());
  document.addEventListener('keydown', onKey);

  document.body.append(el);
  document.body.classList.add('no-scroll');
  show();
}

/** Opens one user's stories (e.g. from their profile picture). Resolves false if they have none. */
export async function openUserStories(username) {
  const { user, stories } = await api.get(`/stories/user/${encodeURIComponent(username)}`);
  if (!stories.length) return false;
  const isMe = store.me && user._id === store.me._id;
  openStoryViewer([{ user, stories, isMe, hasUnseen: stories.some((s) => !s.seen) }], 0, { single: true });
  return true;
}
