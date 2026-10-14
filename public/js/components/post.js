import { api } from '../api.js';
import { icons } from '../icons.js';
import { store, toggleLike, toggleSave, toggleFollow } from '../store.js';
import { h, qs, avatar, userLink, escapeHtml, linkify, timeAgo, formatCount, plural, toast, copyToClipboard } from '../utils.js';
import { carousel } from './carousel.js';
import { openModal, actionSheet, confirmDialog } from './modal.js';
import { followButton, showLikes } from './follow.js';
import { navigate } from '../router.js';

const postUrl = (post) => `${location.origin}/p/${post._id}`;

// ---------------------------------------------------------------------------
// Pieces shared by the feed card and the post detail view
// ---------------------------------------------------------------------------

function likesText(post) {
  if (post.hideLikes && !post.isMine) return post.likesCount ? 'Liked by others' : '';
  if (!post.likesCount) return post.isMine || post.commentsOff ? '' : 'Be the first to <b>like this</b>';
  return `<b>${plural(post.likesCount, 'like')}</b>`;
}

/** Like / comment / share / save row plus the likes line. Stays in sync via the store. */
function actionsBar(post, { onComment }) {
  const el = h(`
    <section class="post-actions">
      <div class="post-actions-row">
        <button class="action like" aria-label="Like"></button>
        ${post.commentsOff ? '' : `<button class="action comment" aria-label="Comment">${icons.comment()}</button>`}
        <button class="action share" aria-label="Share">${icons.share()}</button>
        <button class="action save" aria-label="Save"></button>
      </div>
      <button class="post-likes" type="button"></button>
    </section>`);

  const paint = () => {
    const like = qs('.like', el);
    like.innerHTML = icons.heart(post.isLiked);
    like.classList.toggle('liked', post.isLiked);
    like.setAttribute('aria-label', post.isLiked ? 'Unlike' : 'Like');
    qs('.save', el).innerHTML = icons.bookmark(post.isSaved);
    qs('.save', el).setAttribute('aria-label', post.isSaved ? 'Remove from saved' : 'Save');
    const likes = qs('.post-likes', el);
    likes.innerHTML = likesText(post);
    likes.disabled = !post.likesCount || (post.hideLikes && !post.isMine);
  };
  paint();

  qs('.like', el).addEventListener('click', (e) => {
    e.currentTarget.classList.remove('pop');
    void e.currentTarget.offsetWidth;
    e.currentTarget.classList.add('pop');
    toggleLike(post).catch((err) => toast(err.message));
  });
  qs('.comment', el)?.addEventListener('click', onComment);
  qs('.share', el).addEventListener('click', () => copyToClipboard(postUrl(post)));
  qs('.save', el).addEventListener('click', async () => {
    try {
      const saved = await toggleSave(post);
      toast(saved ? 'Saved to your collection.' : 'Removed from saved.');
    } catch (err) {
      toast(err.message);
    }
  });
  qs('.post-likes', el).addEventListener('click', () => showLikes(post._id));

  store.watch(el, 'post:changed', (p) => p._id === post._id && paint());
  return el;
}

/** "Add a comment…" box. Calls onAdded(comment) after posting. */
function commentForm(post, onAdded, { autofocus = false } = {}) {
  if (post.commentsOff) {
    return h('<div class="comment-form disabled">Commenting has been turned off.</div>');
  }
  const form = h(`
    <form class="comment-form">
      <button type="button" class="emoji-btn" aria-label="Add emoji">${icons.smile()}</button>
      <textarea rows="1" placeholder="Add a comment…" aria-label="Add a comment…" maxlength="2200"></textarea>
      <button type="submit" class="btn-link" disabled>Post</button>
    </form>`);
  const input = qs('textarea', form);
  const submit = qs('button[type=submit]', form);

  const resize = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 80)}px`;
    submit.disabled = !input.value.trim();
  };
  input.addEventListener('input', resize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // Minimal emoji picker
  qs('.emoji-btn', form).addEventListener('click', () => {
    let picker = qs('.emoji-picker', form);
    if (picker) return picker.remove();
    picker = h(`<div class="emoji-picker">${['😂', '😍', '🔥', '👏', '😢', '😮', '🙌', '❤️', '💯', '🥰', '😎', '✨'].map((e) => `<button type="button">${e}</button>`).join('')}</div>`);
    picker.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      input.value += b.textContent;
      resize();
      input.focus();
    });
    form.append(picker);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    submit.disabled = true;
    input.disabled = true;
    try {
      const { comment } = await api.post(`/posts/${post._id}/comments`, { text });
      input.value = '';
      store.updatePost(post._id, { commentsCount: post.commentsCount + 1 });
      onAdded?.(comment);
    } catch (err) {
      toast(err.message);
    } finally {
      input.disabled = false;
      qs('.emoji-picker', form)?.remove();
      resize();
      input.focus();
    }
  });

  form.focusInput = (prefill = '') => {
    if (prefill) input.value = prefill;
    resize();
    input.focus();
  };
  if (autofocus) setTimeout(() => input.focus());
  return form;
}

/** Header: avatar · username · Follow · location, and the ⋯ menu. */
function postHeader(post, { onDeleted, inDetail = false } = {}) {
  const el = h(`
    <header class="post-header">
      ${avatar(post.author, 32, { link: true })}
      <div class="post-header-text">
        <div class="post-header-line">
          ${userLink(post.author)}
          ${inDetail ? '' : `<span class="dot">•</span><a href="/p/${post._id}" class="post-time" data-link title="${new Date(post.createdAt).toLocaleString()}">${timeAgo(post.createdAt)}</a>`}
          <span class="post-follow-slot"></span>
        </div>
        ${post.location ? `<div class="post-location">${escapeHtml(post.location)}</div>` : ''}
      </div>
      <button class="icon-btn post-more" aria-label="More options">${icons.more()}</button>
    </header>`);

  if (!post.isMine && !post.isFollowingAuthor) {
    const slot = qs('.post-follow-slot', el);
    const btn = followButton({ ...post.author, isFollowing: false }, { variant: 'text', onChange: (r) => { post.isFollowingAuthor = r.isFollowing; } });
    slot.innerHTML = '<span class="dot">•</span>';
    slot.append(btn);
  }

  qs('.post-more', el).addEventListener('click', () => openPostMenu(post, { onDeleted, inDetail }));
  return el;
}

function openPostMenu(post, { onDeleted, inDetail }) {
  const common = [
    ...(inDetail ? [] : [{ label: 'Go to post', action: () => navigate(`/p/${post._id}`) }]),
    { label: 'Copy link', action: () => copyToClipboard(postUrl(post)) },
    { label: 'About this account', action: () => navigate(`/${post.author.username}`) },
  ];

  if (post.isMine) {
    actionSheet([
      { label: 'Delete', danger: true, bold: true, action: () => deletePost(post, onDeleted) },
      { label: 'Edit', action: () => editPost(post) },
      { label: post.hideLikes ? 'Unhide like count to others' : 'Hide like count to others', action: () => updatePost(post, { hideLikes: !post.hideLikes }, post.hideLikes ? 'Like count is now visible.' : 'Like count hidden.') },
      { label: post.commentsOff ? 'Turn on commenting' : 'Turn off commenting', action: () => updatePost(post, { commentsOff: !post.commentsOff }, post.commentsOff ? 'Commenting turned on.' : 'Commenting turned off.', true) },
      ...common,
    ]);
  } else {
    actionSheet([
      ...(post.isFollowingAuthor
        ? [{ label: 'Unfollow', danger: true, bold: true, action: async () => {
            await toggleFollow(post.author.username);
            post.isFollowingAuthor = false;
            toast(`Unfollowed @${post.author.username}.`);
          } }]
        : []),
      { label: post.isSaved ? 'Remove from saved' : 'Save', action: () => toggleSave(post).catch((e) => toast(e.message)) },
      ...common,
    ]);
  }
}

async function updatePost(post, patch, message, rerender = false) {
  try {
    const res = await api.put(`/posts/${post._id}`, patch);
    store.updatePost(post._id, res.post);
    if (rerender) store.emit('post:rerender', post);
    toast(message);
  } catch (err) {
    toast(err.message);
  }
}

async function deletePost(post, onDeleted) {
  const ok = await confirmDialog({ title: 'Delete post?', message: 'Are you sure you want to delete this post?', confirmLabel: 'Delete' });
  if (!ok) return;
  try {
    await api.del(`/posts/${post._id}`);
    store.removePost(post._id);
    if (store.me) store.setMe({ postsCount: Math.max((store.me.postsCount || 1) - 1, 0) });
    toast('Post deleted.');
    onDeleted?.();
  } catch (err) {
    toast(err.message);
  }
}

function editPost(post) {
  const body = h(`
    <form class="edit-post">
      <div class="edit-post-preview"><img src="${escapeHtml(post.images[0])}" alt="" /></div>
      <div class="edit-post-fields">
        <div class="edit-post-author">${avatar(post.author, 28)} <b>${escapeHtml(post.author.username)}</b></div>
        <textarea name="caption" maxlength="2200" placeholder="Write a caption…">${escapeHtml(post.caption)}</textarea>
        <div class="char-count"><span>${post.caption.length}</span>/2,200</div>
        <label class="input-row">${icons.location()}<input name="location" placeholder="Add location" value="${escapeHtml(post.location)}" maxlength="100" /></label>
      </div>
    </form>`);
  const modal = openModal({
    title: 'Edit info',
    body,
    className: 'modal-edit-post',
    headerLeft: '<button type="button" class="btn-text cancel">Cancel</button>',
    headerRight: '<button type="button" class="btn-link done">Done</button>',
  });
  const caption = qs('textarea', body);
  caption.addEventListener('input', () => (qs('.char-count span', body).textContent = caption.value.length));
  qs('.cancel', modal.el).addEventListener('click', () => modal.close());
  qs('.done', modal.el).addEventListener('click', async () => {
    try {
      const res = await api.put(`/posts/${post._id}`, Object.fromEntries(new FormData(body)));
      store.updatePost(post._id, res.post);
      store.emit('post:rerender', post);
      modal.close();
      toast('Post updated.');
    } catch (err) {
      toast(err.message);
    }
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/** Full comment row (used in the detail view). */
function commentRow(comment, post, { onReply, onDelete } = {}) {
  const el = h(`
    <div class="comment">
      ${avatar(comment.author, 32, { link: true })}
      <div class="comment-body">
        <div class="comment-text">${userLink(comment.author)} <span>${linkify(comment.text)}</span></div>
        <div class="comment-meta">
          <time datetime="${comment.createdAt}">${timeAgo(comment.createdAt)}</time>
          <span class="comment-likes"></span>
          <button type="button" class="reply">Reply</button>
          ${comment.canDelete ? `<button type="button" class="comment-more" aria-label="Comment options">${icons.more()}</button>` : ''}
        </div>
      </div>
      <button type="button" class="comment-like" aria-label="Like comment"></button>
    </div>`);

  const paint = () => {
    const btn = qs('.comment-like', el);
    btn.innerHTML = icons.heart(comment.isLiked);
    btn.classList.toggle('liked', comment.isLiked);
    qs('.comment-likes', el).textContent = comment.likesCount ? plural(comment.likesCount, 'like') : '';
  };
  paint();

  qs('.comment-like', el).addEventListener('click', async () => {
    const like = !comment.isLiked;
    Object.assign(comment, { isLiked: like, likesCount: comment.likesCount + (like ? 1 : -1) });
    paint();
    try {
      const res = like ? await api.put(`/comments/${comment._id}/like`) : await api.del(`/comments/${comment._id}/like`);
      Object.assign(comment, res);
      paint();
    } catch (err) {
      toast(err.message);
    }
  });
  qs('.reply', el).addEventListener('click', () => onReply?.(comment));
  qs('.comment-more', el)?.addEventListener('click', () =>
    actionSheet([{ label: 'Delete', danger: true, bold: true, action: async () => {
      try {
        await api.del(`/comments/${comment._id}`);
        el.remove();
        store.updatePost(post._id, { commentsCount: Math.max(post.commentsCount - 1, 0) });
        onDelete?.(comment);
      } catch (err) {
        toast(err.message);
      }
    } }])
  );
  return el;
}

/** Compact comment line under feed cards: "username text  ♡". */
function previewComment(comment) {
  const el = h(`
    <div class="preview-comment">
      <span>${userLink(comment.author)} ${linkify(comment.text)}</span>
      <button type="button" class="comment-like small" aria-label="Like comment">${icons.heart(comment.isLiked)}</button>
    </div>`);
  const btn = qs('.comment-like', el);
  btn.classList.toggle('liked', comment.isLiked);
  btn.addEventListener('click', async () => {
    comment.isLiked = !comment.isLiked;
    btn.innerHTML = icons.heart(comment.isLiked);
    btn.classList.toggle('liked', comment.isLiked);
    try {
      if (comment.isLiked) await api.put(`/comments/${comment._id}/like`);
      else await api.del(`/comments/${comment._id}/like`);
    } catch (err) {
      toast(err.message);
    }
  });
  return el;
}

/** Caption with "… more" truncation for long texts. */
function captionBlock(post) {
  if (!post.caption) return h('<div class="post-caption empty"></div>');
  const long = post.caption.length > 125 || post.caption.split('\n').length > 2;
  const el = h(`
    <div class="post-caption">
      ${userLink(post.author)}
      <span class="caption-text ${long ? 'clamped' : ''}">${linkify(post.caption)}</span>
      ${long ? '<button type="button" class="more">more</button>' : ''}
    </div>`);
  qs('.more', el)?.addEventListener('click', (e) => {
    qs('.caption-text', el).classList.remove('clamped');
    e.currentTarget.remove();
  });
  return el;
}

// ---------------------------------------------------------------------------
// Feed card
// ---------------------------------------------------------------------------

export function postCard(rawPost) {
  const post = store.upsertPost(rawPost);
  const el = h('<article class="post-card"></article>');

  const render = () => {
    el.innerHTML = '';
    const viewAll = h(`<button type="button" class="view-comments"></button>`);
    const preview = h('<div class="preview-comments"></div>');
    (post.previewComments || []).forEach((c) => preview.append(previewComment(c)));

    const paintViewAll = () => {
      viewAll.hidden = post.commentsCount <= (post.previewComments || []).length;
      viewAll.textContent = post.commentsCount === 1 ? 'View 1 comment' : `View all ${formatCount(post.commentsCount)} comments`;
    };
    paintViewAll();

    const openDetail = () => openPostModal(post);
    viewAll.addEventListener('click', openDetail);

    const form = commentForm(post, (c) => {
      post.previewComments = [...(post.previewComments || []), c];
      preview.append(previewComment(c));
      paintViewAll();
    });

    el.append(
      postHeader(post, { onDeleted: () => el.remove() }),
      carousel(post.images, { alt: `Photo by ${post.author.username}`, onDoubleTap: () => !post.isLiked && toggleLike(post, true).catch((e) => toast(e.message)) }),
      actionsBar(post, { onComment: () => form.focusInput?.() }),
      captionBlock(post),
      viewAll,
      preview,
      form
    );

    store.watch(viewAll, 'post:changed', (p) => p._id === post._id && paintViewAll());
  };

  render();
  store.watch(el, 'post:rerender', (p) => p._id === post._id && render());
  store.watch(el, 'post:deleted', (p) => p._id === post._id && el.remove());
  return el;
}

// ---------------------------------------------------------------------------
// Post detail (modal on desktop, or the /p/:id page)
// ---------------------------------------------------------------------------

export function postDetail(rawPost, { onDeleted, inModal = false } = {}) {
  const post = store.upsertPost(rawPost);
  const el = h(`<div class="post-detail ${inModal ? 'in-modal' : ''}"></div>`);

  const render = () => {
    el.innerHTML = '';
    const comments = h(`<div class="pd-comments">${icons.spinner()}</div>`);
    const form = commentForm(post, (c) => {
      comments.append(commentRow(c, post, { onReply }));
      comments.scrollTop = comments.scrollHeight;
    });
    const onReply = (c) => form.focusInput?.(`@${c.author.username} `);

    const side = h('<div class="pd-side"></div>');
    const footer = h('<div class="pd-footer"></div>');
    footer.append(
      actionsBar(post, { onComment: () => form.focusInput?.() }),
      h(`<time class="pd-time" datetime="${post.createdAt}" title="${new Date(post.createdAt).toLocaleString()}">${timeAgo(post.createdAt, true)}</time>`)
    );
    side.append(postHeader(post, { onDeleted, inDetail: true }), comments, footer, form);

    el.append(
      h('<div class="pd-media"></div>'),
      side
    );
    qs('.pd-media', el).append(
      carousel(post.images, { alt: `Photo by ${post.author.username}`, onDoubleTap: () => !post.isLiked && toggleLike(post, true).catch((e) => toast(e.message)) })
    );

    // Caption shows as the first "comment"
    api.get(`/posts/${post._id}/comments`)
      .then(({ comments: list }) => {
        comments.innerHTML = '';
        if (post.caption) {
          comments.append(h(`
            <div class="comment caption">
              ${avatar(post.author, 32, { link: true })}
              <div class="comment-body">
                <div class="comment-text">${userLink(post.author)} <span>${linkify(post.caption)}</span></div>
                <div class="comment-meta"><time>${timeAgo(post.createdAt)}</time>${post.updatedAt !== post.createdAt ? '<span>Edited</span>' : ''}</div>
              </div>
            </div>`));
        }
        list.forEach((c) => comments.append(commentRow(c, post, { onReply })));
        if (!post.caption && !list.length) {
          comments.append(h(`<div class="pd-no-comments"><h3>No comments yet.</h3><p>${post.commentsOff ? 'Commenting is turned off.' : 'Start the conversation.'}</p></div>`));
        }
      })
      .catch((err) => (comments.innerHTML = `<p class="empty-small">${escapeHtml(err.message)}</p>`));
  };

  render();
  store.watch(el, 'post:rerender', (p) => p._id === post._id && render());
  return el;
}

/** Opens a post in a modal (Instagram's desktop behaviour); on phones it navigates instead. */
export async function openPostModal(postOrId) {
  if (window.matchMedia('(max-width: 767px)').matches) {
    return navigate(`/p/${postOrId._id || postOrId}`);
  }
  let post = postOrId;
  if (typeof postOrId === 'string') {
    try {
      post = (await api.get(`/posts/${postOrId}`)).post;
    } catch (err) {
      return toast(err.message);
    }
  }
  const modal = openModal({ body: '', className: 'modal-post', closeButton: true });
  modal.body.append(postDetail(post, { inModal: true, onDeleted: () => modal.close() }));
  return modal;
}
