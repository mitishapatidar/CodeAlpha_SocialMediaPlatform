const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { upload, fileUrl } = require('../middleware/upload');
const { HttpError, removeUpload } = require('../utils/errors');
const { RESERVED_USERNAMES } = require('../utils/reserved');
const { AUTHOR_FIELDS, serializePost, userRow } = require('../utils/serialize');

const PAGE_SIZE = 12;

router.use(requireAuth);

async function findByUsername(username) {
  const user = await User.findOne({ username: String(username).toLowerCase() });
  if (!user) throw new HttpError(404, "Sorry, this page isn't available.");
  return user;
}

// ---------- My account ----------

// PUT /api/users/me  → edit profile
router.put('/me', async (req, res) => {
  const me = req.user;
  const { fullName, username, bio, website, gender, isPrivate } = req.body;

  if (username !== undefined) {
    const u = String(username).toLowerCase().trim();
    if (u !== me.username) {
      if (RESERVED_USERNAMES.has(u) || (await User.exists({ username: u }))) throw new HttpError(409, "This username isn't available. Please try another.");
      me.username = u;
    }
  }
  if (fullName !== undefined) me.fullName = String(fullName).trim();
  if (bio !== undefined) me.bio = String(bio);
  if (website !== undefined) me.website = String(website).trim();
  if (gender !== undefined) me.gender = gender;
  if (isPrivate !== undefined) me.isPrivate = !!isPrivate;

  await me.save();
  res.json({ user: { ...me.toProfile(me._id), email: me.email, gender: me.gender } });
});

// PUT /api/users/me/avatar  (multipart field "avatar")
router.put('/me/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose a photo to upload.');
  removeUpload(req.user.avatar);
  req.user.avatar = fileUrl(req.file);
  await req.user.save();
  res.json({ avatar: req.user.avatar });
});

// DELETE /api/users/me/avatar
router.delete('/me/avatar', async (req, res) => {
  removeUpload(req.user.avatar);
  req.user.avatar = '';
  await req.user.save();
  res.json({ avatar: '' });
});

// GET /api/users/suggestions  → "Suggested for you"
router.get('/suggestions', async (req, res) => {
  const me = req.user;
  const limit = Math.min(Number(req.query.limit) || 5, 30);
  const exclude = [me._id, ...me.following];

  const users = await User.aggregate([
    { $match: { _id: { $nin: exclude } } },
    // Friends-of-friends first, then the most followed accounts
    { $addFields: {
      mutuals: { $size: { $setIntersection: ['$followers', me.following] } },
      followsMe: { $in: [me._id, '$following'] },
      followersCount: { $size: '$followers' },
    } },
    { $sort: { followsMe: -1, mutuals: -1, followersCount: -1, createdAt: -1 } },
    { $limit: limit },
  ]);

  // Name one mutual follower for the "Followed by x" subtitle
  const mutualIds = users.flatMap((u) => u.followers.filter((f) => me.following.some((m) => String(m) === String(f))).slice(0, 1));
  const mutualNames = new Map((await User.find({ _id: { $in: mutualIds } }, 'username')).map((u) => [String(u._id), u.username]));

  res.json({
    users: users.map((u) => {
      const firstMutual = u.followers.find((f) => mutualNames.has(String(f)));
      let reason = 'Suggested for you';
      if (u.followsMe) reason = 'Follows you';
      else if (firstMutual) reason = `Followed by ${mutualNames.get(String(firstMutual))}${u.mutuals > 1 ? ` + ${u.mutuals - 1} more` : ''}`;
      else if (Date.now() - new Date(u.createdAt) < 7 * 864e5) reason = 'New to Instaclone';
      return { ...userRow(u, me), reason };
    }),
  });
});

// ---------- Any user ----------

// GET /api/users/:username  → profile header
router.get('/:username', async (req, res) => {
  const user = await findByUsername(req.params.username);
  const postsCount = await Post.countDocuments({ author: user._id });
  res.json({ user: { ...user.toProfile(req.user._id), postsCount } });
});

// GET /api/users/:username/posts?page=1
router.get('/:username/posts', async (req, res) => {
  const user = await findByUsername(req.params.username);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const posts = await Post.find({ author: user._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE + 1)
    .populate('author', AUTHOR_FIELDS);
  res.json({
    posts: posts.slice(0, PAGE_SIZE).map((p) => serializePost(p, req.user)),
    hasMore: posts.length > PAGE_SIZE,
  });
});

// GET /api/users/:username/saved  → only visible to the owner
router.get('/:username/saved', async (req, res) => {
  if (req.params.username.toLowerCase() !== req.user.username) throw new HttpError(403, 'Only you can see what you\'ve saved.');
  const posts = await Post.find({ _id: { $in: req.user.saved } }).populate('author', AUTHOR_FIELDS);
  // Keep the order in which posts were saved (most recent first)
  const order = new Map(req.user.saved.map((id, i) => [String(id), i]));
  posts.sort((a, b) => order.get(String(b._id)) - order.get(String(a._id)));
  res.json({ posts: posts.map((p) => serializePost(p, req.user)), hasMore: false });
});

// GET /api/users/:username/followers  &  /following
for (const list of ['followers', 'following']) {
  router.get(`/:username/${list}`, async (req, res) => {
    const user = await findByUsername(req.params.username);
    await user.populate(list, AUTHOR_FIELDS);
    const q = String(req.query.q || '').toLowerCase();
    const users = user[list]
      .filter((u) => !q || u.username.includes(q) || u.fullName.toLowerCase().includes(q))
      .reverse(); // most recent first
    res.json({ users: users.map((u) => userRow(u, req.user)) });
  });
}

// POST /api/users/:username/follow  → toggles follow / unfollow
router.post('/:username/follow', async (req, res) => {
  const target = await findByUsername(req.params.username);
  const me = req.user;
  if (target._id.equals(me._id)) throw new HttpError(400, "You can't follow yourself.");

  const isFollowing = me.following.some((id) => id.equals(target._id));
  if (isFollowing) {
    await User.updateOne({ _id: me._id }, { $pull: { following: target._id } });
    await User.updateOne({ _id: target._id }, { $pull: { followers: me._id } });
    await Notification.unnotify({ recipient: target._id, sender: me._id, type: 'follow' });
  } else {
    await User.updateOne({ _id: me._id }, { $addToSet: { following: target._id } });
    await User.updateOne({ _id: target._id }, { $addToSet: { followers: me._id } });
    await Notification.notify({ recipient: target._id, sender: me._id, type: 'follow' });
  }

  const updated = await User.findById(target._id, 'followers');
  res.json({ isFollowing: !isFollowing, followersCount: updated.followers.length });
});

// DELETE /api/users/:username/follower  → remove someone who follows me
router.delete('/:username/follower', async (req, res) => {
  const follower = await findByUsername(req.params.username);
  await User.updateOne({ _id: req.user._id }, { $pull: { followers: follower._id } });
  await User.updateOne({ _id: follower._id }, { $pull: { following: req.user._id } });
  res.json({ ok: true });
});

module.exports = router;
