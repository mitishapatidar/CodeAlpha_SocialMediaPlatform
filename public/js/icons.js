// Inline SVG icons (Instagram-style, 24×24, drawn with currentColor)
const svg = (body, { size = 24, fill = 'none', label = '' } = {}) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${body}</svg>`;

export const icons = {
  home: (filled) =>
    filled
      ? svg('<path d="M3 10.2 12 3l9 7.2V21h-6.5v-6.2h-5V21H3z" fill="currentColor"/>', { label: 'Home' })
      : svg('<path d="M3 10.2 12 3l9 7.2V21h-6.5v-6.2h-5V21H3z"/>', { label: 'Home' }),
  search: (bold) => svg(`<circle cx="10.5" cy="10.5" r="7.5" ${bold ? 'stroke-width="3"' : ''}/><path d="m16.5 16.5 5 5" ${bold ? 'stroke-width="3"' : ''}/>`, { label: 'Search' }),
  explore: (filled) =>
    svg(`<circle cx="12" cy="12" r="10"/><path d="M15.8 8.2 13.6 13.6 8.2 15.8l2.2-5.4z" ${filled ? 'fill="currentColor"' : ''}/>`, { label: 'Explore' }),
  heart: (filled) =>
    filled
      ? svg('<path d="M16.8 3.5c-2 0-3.7 1.1-4.8 2.8-1.1-1.7-2.8-2.8-4.8-2.8C4.3 3.5 2 6 2 9.1c0 5.7 9.2 11.3 10 11.4.8-.1 10-5.7 10-11.4 0-3.1-2.3-5.6-5.2-5.6z" fill="currentColor" stroke="none"/>', { label: 'Unlike' })
      : svg('<path d="M16.8 3.5c-2 0-3.7 1.1-4.8 2.8-1.1-1.7-2.8-2.8-4.8-2.8C4.3 3.5 2 6 2 9.1c0 5.7 9.2 11.3 10 11.4.8-.1 10-5.7 10-11.4 0-3.1-2.3-5.6-5.2-5.6z"/>', { label: 'Like' }),
  comment: () => svg('<path d="M20.7 16.7A9.5 9.5 0 1 0 17 20.4L21.5 21.5z"/>', { label: 'Comment' }),
  share: () => svg('<path d="M22 3 9.2 10.1"/><path d="M22 3 15 21l-5.8-10.9L2 6.7z"/>', { label: 'Share' }),
  bookmark: (filled) =>
    svg('<path d="M19 21 12 14.6 5 21V3h14z"/>', { label: filled ? 'Remove' : 'Save', fill: filled ? 'currentColor' : 'none' }),
  create: () => svg('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 7.5v9M7.5 12h9"/>', { label: 'New post' }),
  plus: () => svg('<path d="M12 3v18M3 12h18"/>', { label: 'Add' }),
  more: () => svg('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>', { label: 'More options' }),
  menu: () => svg('<path d="M3 5h18M3 12h18M3 19h18"/>', { label: 'Menu' }),
  close: () => svg('<path d="M19 5 5 19M5 5l14 14"/>', { label: 'Close' }),
  back: () => svg('<path d="M15 19 8 12l7-7"/>', { label: 'Back' }),
  chevronLeft: () => svg('<path d="m15 18-6-6 6-6"/>', { size: 16, label: 'Previous' }),
  chevronRight: () => svg('<path d="m9 18 6-6-6-6"/>', { size: 16, label: 'Next' }),
  grid: () => svg('<rect x="3" y="3" width="18" height="18"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>', { size: 14, label: 'Posts' }),
  tagged: () => svg('<path d="M10 18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-5l-2 3z"/><circle cx="12" cy="9" r="3"/><path d="M7 16c.7-2 2.6-3 5-3s4.3 1 5 3"/>', { size: 14, label: 'Tagged' }),
  settings: () => svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', { label: 'Settings' }),
  moon: () => svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', { label: 'Switch appearance' }),
  sun: () => svg('<circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2M12 20.5v2M4.6 4.6 6 6M18 18l1.4 1.4M1.5 12h2M20.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>', { label: 'Switch appearance' }),
  logout: () => svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>', { label: 'Log out' }),
  bookmarkSmall: () => svg('<path d="M19 21 12 14.6 5 21V3h14z"/>', { size: 14, label: 'Saved' }),
  photo: () =>
    `<svg class="icon" width="96" height="77" viewBox="0 0 97.6 77.3" fill="currentColor" aria-hidden="true"><path d="M16.3 24h.3c2.8-.2 4.9-2.6 4.8-5.4-.2-2.8-2.6-4.9-5.4-4.8s-4.9 2.6-4.8 5.4c.1 2.7 2.4 4.8 5.1 4.8zm-2.4-7.2c.5-.6 1.3-1 2.1-1h.2c1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.4 3.1-3.1 3.1-1.7 0-3.1-1.4-3.1-3.1 0-.8.3-1.5.8-2.1z"/><path d="M84.7 18.4 58 16.9l-.2-3c-.3-5.7-5.2-10.1-11-9.8L12.9 6c-5.7.3-10.1 5.3-9.8 11L5 51v.8c.7 5.2 5.1 9.1 10.3 9.1h.6l21.7-1.2v.6c-.3 5.7 4 10.7 9.8 11l34 2h.6c5.5 0 10.1-4.3 10.4-9.8l2-34c.4-5.8-4-10.7-9.7-11.1zM7.2 10.8C8.7 9.1 10.8 8.1 13 8l34-1.9c4.6-.3 8.6 3.3 8.9 7.9l.2 2.8-5.3-.3c-5.7-.3-10.7 4-11 9.8l-.6 9.5-9.5 10.7c-.2.3-.6.4-1 .5-.4 0-.7-.1-1-.4l-7.8-7c-1.4-1.3-3.5-1.1-4.8.3L7 49 5.2 17c-.2-2.3.6-4.5 2-6.2zm8.7 48c-4.3.2-8.1-2.8-8.8-7.1l9.4-10.5c.2-.3.6-.4 1-.5.4 0 .7.1 1 .4l7.8 7c.7.6 1.6.9 2.5.9.9 0 1.7-.5 2.3-1.1l7.8-8.8-1.1 18.6-21.9 1.1zm76.5-29.5-2 34c-.3 4.6-4.3 8.2-8.9 7.9l-34-2c-4.6-.3-8.2-4.3-7.9-8.9l2-34c.3-4.4 3.9-7.9 8.4-7.9h.5l34 2c4.7.3 8.2 4.3 7.9 8.9z"/><path d="M78.2 41.6 61.3 30.5c-2.1-1.4-4.9-.8-6.2 1.3-.4.7-.7 1.4-.7 2.2l-1.2 20.1c-.1 2.5 1.7 4.6 4.2 4.8h.3c.7 0 1.4-.2 2-.5l18-9c2.2-1.1 3.1-3.8 2-6-.4-.7-.9-1.3-1.5-1.8zm-1.4 6-18 9c-.4.2-.8.3-1.3.3-.4 0-.9-.2-1.2-.4-.7-.5-1.2-1.3-1.1-2.2l1.2-20.1c.1-.9.6-1.7 1.4-2.1.8-.4 1.7-.3 2.5.1L77 43.3c1.2.8 1.5 2.3.7 3.4-.2.4-.5.7-.9.9z"/></svg>`,
  camera: () => svg('<circle cx="12" cy="13" r="4"/><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.5-2.5h6.4L16.7 6h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>', { size: 44, label: 'Camera' }),
  location: () => svg('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', { size: 18, label: 'Location' }),
  link: () => svg('<path d="M10 14a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7"/><path d="M14 10a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>', { size: 14, label: 'Link' }),
  hashtag: () => svg('<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>', { size: 22, label: 'Hashtag' }),
  copies: () => svg('<rect x="8" y="8" width="13" height="13" rx="2" fill="currentColor" stroke="none"/><path d="M5 16V5a2 2 0 0 1 2-2h11" />', { size: 20, label: 'Carousel' }),
  verified: () =>
    `<svg class="verified" width="12" height="12" viewBox="0 0 40 40" role="img" aria-label="Verified"><path fill="#0095f6" d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"/></svg>`,
  spinner: () => '<div class="spinner" role="status" aria-label="Loading"></div>',
  smile: () => svg('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9.5" r=".8" fill="currentColor"/><circle cx="15" cy="9.5" r=".8" fill="currentColor"/>', { label: 'Emoji' }),
};
