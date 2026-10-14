import { api } from '../api.js';
import { icons } from '../icons.js';
import { store } from '../store.js';
import { h, qs, avatar, escapeHtml, toast } from '../utils.js';
import { openModal, confirmDialog } from './modal.js';
import { carousel } from './carousel.js';

const MAX_IMAGES = 10;
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

/** Instagram-style "Create new post" flow: select → preview → caption → share. */
export function openCreatePost() {
  let files = [];
  let urls = [];
  let step = 'select';
  let sharing = false;

  const modal = openModal({
    title: 'Create new post',
    body: '',
    className: 'modal-create',
    headerLeft: '<button type="button" class="icon-btn back" aria-label="Back" hidden>' + icons.back() + '</button>',
    headerRight: '<button type="button" class="btn-link next" hidden>Next</button>',
    // Ask before throwing away a half-made post
    beforeClose: () => {
      if (step === 'select' || step === 'done' || sharing) return true;
      confirmDialog({ title: 'Discard post?', message: "If you leave, your edits won't be saved.", confirmLabel: 'Discard' }).then((ok) => ok && modal.close(true));
      return false;
    },
    onClose: () => urls.forEach(URL.revokeObjectURL),
  });

  const backBtn = qs('.back', modal.el);
  const nextBtn = qs('.next', modal.el);
  const fileInput = h(`<input type="file" accept="${ACCEPT}" multiple hidden />`);
  modal.el.append(fileInput);

  const addFiles = (list) => {
    const images = [...list].filter((f) => ACCEPT.split(',').includes(f.type));
    if (!images.length) return toast('This file is not supported. Choose a photo (JPG, PNG, GIF or WEBP).');
    const room = MAX_IMAGES - files.length;
    if (images.length > room) toast(`You can only choose ${MAX_IMAGES} photos.`);
    const added = images.slice(0, room).filter((f) => {
      if (f.size <= 8 * 1024 * 1024) return true;
      toast(`${f.name} is larger than 8 MB.`);
      return false;
    });
    files.push(...added);
    urls.push(...added.map((f) => URL.createObjectURL(f)));
    if (files.length) show('preview');
  };

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });

  // ---------- Steps ----------
  const views = {
    select() {
      modal.setTitle('Create new post');
      const el = h(`
        <div class="create-select">
          ${icons.photo()}
          <p>Drag photos here</p>
          <button type="button" class="btn btn-primary">Select from computer</button>
        </div>`);
      qs('button', el).addEventListener('click', () => fileInput.click());
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('dragging'); });
      el.addEventListener('dragleave', () => el.classList.remove('dragging'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('dragging');
        addFiles(e.dataTransfer.files);
      });
      return el;
    },

    preview() {
      modal.setTitle('Preview');
      const el = h(`
        <div class="create-preview">
          <div class="create-media"></div>
          <div class="create-thumbs">
            ${urls.map((u, i) => `<div class="thumb"><img src="${u}" alt="Selected photo ${i + 1}" /><button type="button" data-remove="${i}" aria-label="Remove photo">${icons.close()}</button></div>`).join('')}
            ${files.length < MAX_IMAGES ? `<button type="button" class="thumb add" aria-label="Add more photos">${icons.plus()}</button>` : ''}
          </div>
        </div>`);
      qs('.create-media', el).append(carousel(urls));
      el.addEventListener('click', (e) => {
        if (e.target.closest('.add')) return fileInput.click();
        const rm = e.target.closest('[data-remove]');
        if (!rm) return;
        const i = Number(rm.dataset.remove);
        URL.revokeObjectURL(urls[i]);
        files.splice(i, 1);
        urls.splice(i, 1);
        show(files.length ? 'preview' : 'select');
      });
      return el;
    },

    caption() {
      modal.setTitle('Create new post');
      const me = store.me;
      const el = h(`
        <div class="create-caption">
          <div class="create-media"></div>
          <form class="create-form">
            <div class="create-author">${avatar(me, 28)} <b>${escapeHtml(me.username)}</b></div>
            <textarea name="caption" maxlength="2200" placeholder="Write a caption… Use #hashtags and @mentions" aria-label="Write a caption"></textarea>
            <div class="char-count"><span>0</span>/2,200</div>
            <label class="input-row">${icons.location()}<input name="location" placeholder="Add location" maxlength="100" /></label>
            <details class="advanced">
              <summary>Advanced settings</summary>
              <label class="toggle-row">
                <span><b>Hide like count on this post</b><small>Only you will see the total number of likes on this post.</small></span>
                <input type="checkbox" name="hideLikes" class="switch" />
              </label>
              <label class="toggle-row">
                <span><b>Turn off commenting</b><small>You can change this later from the ⋯ menu on your post.</small></span>
                <input type="checkbox" name="commentsOff" class="switch" />
              </label>
            </details>
          </form>
        </div>`);
      qs('.create-media', el).append(carousel(urls));
      const ta = qs('textarea', el);
      ta.value = state.caption || '';
      qs('[name=location]', el).value = state.location || '';
      qs('.char-count span', el).textContent = ta.value.length;
      ta.addEventListener('input', () => {
        qs('.char-count span', el).textContent = ta.value.length;
        state.caption = ta.value;
      });
      qs('[name=location]', el).addEventListener('input', (e) => (state.location = e.target.value));
      setTimeout(() => ta.focus());
      return el;
    },

    sharing() {
      modal.setTitle('Sharing');
      return h(`<div class="create-status"><div class="share-ring"></div></div>`);
    },

    done() {
      modal.setTitle('Post shared');
      return h(`
        <div class="create-status">
          <div class="share-done">${icons.heart(true)}</div>
          <p>Your post has been shared.</p>
        </div>`);
    },
  };

  const state = { caption: '', location: '' };

  function show(next) {
    step = next;
    modal.body.innerHTML = '';
    modal.body.append(views[next]());
    modal.el.dataset.step = next;
    backBtn.hidden = !['preview', 'caption'].includes(next);
    nextBtn.hidden = !['preview', 'caption'].includes(next);
    nextBtn.textContent = next === 'caption' ? 'Share' : 'Next';
  }

  backBtn.addEventListener('click', () => {
    if (step === 'caption') return show('preview');
    confirmDialog({ title: 'Discard post?', message: "If you leave, your edits won't be saved.", confirmLabel: 'Discard' }).then((ok) => {
      if (!ok) return;
      urls.forEach(URL.revokeObjectURL);
      files = [];
      urls = [];
      show('select');
    });
  });

  nextBtn.addEventListener('click', async () => {
    if (step === 'preview') return show('caption');
    if (step !== 'caption') return;

    const form = qs('.create-form', modal.body);
    const fd = new FormData(form);
    files.forEach((f) => fd.append('images', f));
    sharing = true;
    show('sharing');
    try {
      const { post } = await api.post('/posts', fd);
      store.setMe({ postsCount: (store.me.postsCount || 0) + 1 });
      store.emit('post:created', post);
      show('done');
    } catch (err) {
      toast(err.message);
      show('caption');
    } finally {
      sharing = false;
    }
  });

  show('select');
  return modal;
}
