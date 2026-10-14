import { h, escapeHtml } from '../utils.js';
import { icons } from '../icons.js';

const openModals = [];

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openModals.length) openModals[openModals.length - 1].close();
});

/**
 * Opens a modal dialog.
 * @param {object} o
 * @param {string} [o.title]            header text (no header when omitted)
 * @param {string|Element} o.body        content
 * @param {string} [o.className]         extra class on the dialog box
 * @param {boolean} [o.closeButton]      show the big ✕ in the page corner (Instagram post viewer style)
 * @param {Function} [o.onClose]
 * @param {Function} [o.beforeClose]     return false to keep the modal open
 */
export function openModal({ title, body, className = '', closeButton = false, onClose, beforeClose, headerLeft = '', headerRight = '' }) {
  const backdrop = h(`
    <div class="modal-backdrop">
      ${closeButton ? `<button class="modal-corner-close" aria-label="Close">${icons.close()}</button>` : ''}
      <div class="modal ${className}" role="dialog" aria-modal="true" ${title ? `aria-label="${escapeHtml(title)}"` : ''}>
        ${title !== undefined ? `
          <div class="modal-header">
            <div class="modal-header-side">${headerLeft}</div>
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            <div class="modal-header-side right">${headerRight || `<button class="modal-close" aria-label="Close">${icons.close()}</button>`}</div>
          </div>` : ''}
        <div class="modal-body"></div>
      </div>
    </div>`);

  const bodyEl = backdrop.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.append(body);

  const previousFocus = document.activeElement;
  const modal = {
    el: backdrop.querySelector('.modal'),
    body: bodyEl,
    backdrop,
    close(force = false) {
      if (!force && beforeClose && beforeClose() === false) return;
      backdrop.remove();
      openModals.splice(openModals.indexOf(modal), 1);
      if (!openModals.length) document.body.classList.remove('no-scroll');
      previousFocus?.focus?.();
      onClose?.();
    },
    setTitle(text) {
      const t = backdrop.querySelector('.modal-title');
      if (t) t.textContent = text;
    },
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('.modal-close, .modal-corner-close')) modal.close();
  });

  document.body.append(backdrop);
  document.body.classList.add('no-scroll');
  openModals.push(modal);
  modal.el.setAttribute('tabindex', '-1');
  modal.el.focus({ preventScroll: true });
  return modal;
}

export function closeAllModals() {
  [...openModals].reverse().forEach((m) => m.close(true));
}

/**
 * Instagram-style action sheet: a stack of full-width buttons with Cancel at the bottom.
 * options: [{ label, danger?, bold?, action }]
 */
export function actionSheet(options, { title, subtitle, image, onClose } = {}) {
  const body = h(`
    <div class="action-sheet">
      ${image || title ? `
        <div class="action-sheet-head">
          ${image || ''}
          ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
        </div>` : ''}
      ${options.map((o, i) => `<button data-i="${i}" class="${o.danger ? 'danger' : ''} ${o.bold ? 'bold' : ''}">${escapeHtml(o.label)}</button>`).join('')}
      <button data-cancel>Cancel</button>
    </div>`);
  const modal = openModal({ body, className: 'modal-sheet', onClose });
  body.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    modal.close();
    if (btn.dataset.i !== undefined) options[btn.dataset.i].action?.();
  });
  return modal;
}

/** Promise-based confirm dialog. Resolves true when the user confirms. */
export function confirmDialog({ title, message = '', confirmLabel = 'Confirm', danger = true }) {
  return new Promise((resolve) => {
    let confirmed = false;
    actionSheet([{ label: confirmLabel, danger, bold: true, action: () => (confirmed = true) }], {
      title,
      subtitle: message,
      // onClose runs before the option's action, so defer reading `confirmed`
      onClose: () => setTimeout(() => resolve(confirmed)),
    });
  });
}
