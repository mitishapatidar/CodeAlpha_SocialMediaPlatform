import { h, escapeHtml } from '../utils.js';
import { icons } from '../icons.js';

/**
 * Swipeable image carousel with arrows + dots.
 * `onDoubleTap` fires on double click / double tap (used for "double-tap to like").
 */
export function carousel(images, { onDoubleTap, alt = '' } = {}) {
  const multi = images.length > 1;
  const el = h(`
    <div class="carousel">
      <div class="carousel-track">
        ${images.map((src, i) => `<div class="carousel-slide"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}${multi ? ` (${i + 1} of ${images.length})` : ''}" loading="lazy" draggable="false" /></div>`).join('')}
      </div>
      ${multi ? `
        <button class="carousel-btn prev" aria-label="Previous image" hidden>${icons.chevronLeft()}</button>
        <button class="carousel-btn next" aria-label="Next image">${icons.chevronRight()}</button>
        <div class="carousel-dots">${images.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('')}</div>` : ''}
      <div class="heart-burst" aria-hidden="true">${icons.heart(true)}</div>
    </div>`);

  const track = el.querySelector('.carousel-track');

  if (multi) {
    const prev = el.querySelector('.prev');
    const next = el.querySelector('.next');
    const dots = [...el.querySelectorAll('.carousel-dots span')];
    const index = () => Math.round(track.scrollLeft / track.clientWidth);
    const go = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    prev.addEventListener('click', (e) => { e.stopPropagation(); go(index() - 1); });
    next.addEventListener('click', (e) => { e.stopPropagation(); go(index() + 1); });
    track.addEventListener('scroll', () => {
      const i = index();
      dots.forEach((d, j) => d.classList.toggle('active', i === j));
      prev.hidden = i === 0;
      next.hidden = i === images.length - 1;
    }, { passive: true });
  }

  if (onDoubleTap) {
    const burst = el.querySelector('.heart-burst');
    const fire = () => {
      burst.classList.remove('animate');
      void burst.offsetWidth; // restart the animation
      burst.classList.add('animate');
      onDoubleTap();
    };
    track.addEventListener('dblclick', fire);
    // Touch devices: two taps within 300ms
    let lastTap = 0;
    track.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        e.preventDefault();
        fire();
        lastTap = 0;
      } else lastTap = now;
    });
  }

  return el;
}
