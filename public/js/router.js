// Minimal History-API router: real URLs like /explore, /p/123, /username
let routes = [];
let renderRoute = () => {};

/** Converts "/p/:id" into a RegExp with named groups. */
const compile = (pattern) =>
  new RegExp(`^${pattern.replace(/\/:(\w+)/g, '/(?<$1>[^/]+)')}/?$`);

export function defineRoutes(list, onRender) {
  routes = list.map(([pattern, view, extra = {}]) => ({ re: compile(pattern), view, extra }));
  renderRoute = onRender;
}

export function match(path) {
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = Object.fromEntries(Object.entries(m.groups || {}).map(([k, v]) => [k, decodeURIComponent(v)]));
      return { view: r.view, params: { ...params, ...r.extra } };
    }
  }
  return null;
}

export function navigate(url, { replace = false } = {}) {
  if (url === location.pathname + location.search) {
    // Same page: re-render (e.g. clicking Home again refreshes the feed)
    renderRoute(location.pathname);
    return;
  }
  history[replace ? 'replaceState' : 'pushState']({}, '', url);
  renderRoute(location.pathname);
}

export function startRouter() {
  // Intercept clicks on internal links
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || a.hasAttribute('data-external') || url.pathname.startsWith('/uploads/')) return;
    if (url.pathname === '/login' || url.pathname === '/signup') return;
    e.preventDefault();
    navigate(url.pathname + url.search);
  });
  window.addEventListener('popstate', () => renderRoute(location.pathname));
  renderRoute(location.pathname);
}
