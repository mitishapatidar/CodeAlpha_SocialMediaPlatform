import { api } from '../api.js';
import { icons } from '../icons.js';
import { h } from '../utils.js';
import { navigate } from '../router.js';
import { postDetail } from '../components/post.js';
import { postGrid } from '../components/grid.js';
import { notFoundPage } from './profile.js';

export default async function postPage(root, { id }) {
  root.innerHTML = icons.spinner();
  let post;
  try {
    ({ post } = await api.get(`/posts/${id}`));
  } catch {
    root.innerHTML = '';
    return notFoundPage(root);
  }
  root.innerHTML = '';
  document.title = `${post.author.username} on Instaclone`;
  const el = h('<div class="post-page"></div>');
  el.append(postDetail(post, { onDeleted: () => navigate(`/${post.author.username}`, { replace: true }) }));

  // "More posts from <user>"
  el.append(h(`<h3 class="section-label more-from">More posts from <a href="/${post.author.username}" data-link>${post.author.username}</a></h3>`));
  const grid = postGrid(async (page) => {
    const r = await api.get(`/users/${post.author.username}/posts?page=${page}`);
    return { posts: r.posts.filter((p) => p._id !== post._id).slice(0, 6), hasMore: false };
  });
  el.append(grid.el);
  root.append(el);
  return () => grid.destroy();
}
