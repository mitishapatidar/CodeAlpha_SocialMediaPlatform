// Usernames that would clash with app routes like /explore or /accounts/edit
const RESERVED_USERNAMES = new Set([
  'accounts', 'api', 'create', 'direct', 'explore', 'login', 'logout', 'me', 'notifications',
  'p', 'reels', 'search', 'signup', 'stories', 'suggestions', 'tags', 'uploads', 'css', 'js', 'img',
]);

module.exports = { RESERVED_USERNAMES };
