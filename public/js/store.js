// Shared client state: the logged-in user and a cache of posts, so a like in a
// modal also updates the same post's card in the feed or grid.
import { api } from './api.js';

const bus = new EventTarget();

export const store = {
  me: null,
  posts: new Map(),

  on(event, handler) {
    bus.addEventListener(event, handler);
    return () => bus.removeEventListener(event, handler);
  },
  /** Like `on`, but unsubscribes itself once `el` has been removed from the page. */
  watch(el, event, handler) {
    let attached = false;
    const off = this.on(event, (e) => {
      if (el.isConnected) {
        attached = true;
        handler(e.detail);
      } else if (attached) {
        off();
      }
    });
    // Elements not yet in the DOM get a grace period before being considered gone
    setTimeout(() => { if (el.isConnected) attached = true; else off(); }, 5000);
    return off;
  },
  emit(event, detail) {
    bus.dispatchEvent(new CustomEvent(event, { detail }));
  },

  setMe(user) {
    this.me = { ...this.me, ...user };
    this.emit('me:changed', this.me);
  },

  /** Returns the canonical cached copy of a post, merging in fresh data. */
  upsertPost(post) {
    const cached = this.posts.get(post._id);
    if (cached) {
      Object.assign(cached, post);
      return cached;
    }
    this.posts.set(post._id, post);
    return post;
  },

  updatePost(id, patch) {
    const post = this.posts.get(id);
    if (!post) return;
    Object.assign(post, patch);
    this.emit('post:changed', post);
  },

  removePost(id) {
    this.posts.delete(id);
    this.emit('post:deleted', { _id: id });
  },
};

// ---------- Post actions (shared by cards, modals and grids) ----------

export async function toggleLike(post, like = !post.isLiked) {
  // Optimistic update — revert if the request fails
  const prev = { isLiked: post.isLiked, likesCount: post.likesCount };
  store.updatePost(post._id, { isLiked: like, likesCount: post.likesCount + (like === prev.isLiked ? 0 : like ? 1 : -1) });
  try {
    const res = like ? await api.put(`/posts/${post._id}/like`) : await api.del(`/posts/${post._id}/like`);
    store.updatePost(post._id, res);
  } catch (err) {
    store.updatePost(post._id, prev);
    throw err;
  }
}

export async function toggleSave(post) {
  const save = !post.isSaved;
  store.updatePost(post._id, { isSaved: save });
  try {
    if (save) await api.put(`/posts/${post._id}/save`);
    else await api.del(`/posts/${post._id}/save`);
  } catch (err) {
    store.updatePost(post._id, { isSaved: !save });
    throw err;
  }
  return save;
}

export async function toggleFollow(username) {
  const res = await api.post(`/users/${encodeURIComponent(username)}/follow`);
  if (store.me) store.setMe({ followingCount: store.me.followingCount + (res.isFollowing ? 1 : -1) });
  store.emit('follow:changed', { username, ...res });
  return res;
}
