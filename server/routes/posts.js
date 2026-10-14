const router = require('express').Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { upload, fileUrl } = require('../middleware/upload');
const { HttpError, removeUpload } = require('../utils/errors');
const { AUTHOR_FIELDS, serializePost, serializeComment, userRow } = require('../utils/serialize');

const FEED_PAGE = 8;
const GRID_PAGE = 24;

router.use(requireAuth);

async function findPost(id) {
  const post = await Post.findById(id).populate('author', AUTHOR_FIELDS);
  if (!post) throw new HttpError(404, 'This post is no longer available.');
  return post;
}

const bool = (v) => v === true || v === 'true' || v === 'on' || v === '1';

// GET /api/posts/feed?before=<ISO date>  → posts by people I follow + mine, newest first
router.get('/feed', async (req, res) => {
  const filter = { author: { $in: [req.user._id, ...req.user.following] } };
  if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

  const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(FEED_PAGE + 1).populate('author', AUTHOR_FIELDS);
  const page = posts.slice(0, FEED_PAGE);

  // Attach the 2 latest comments for the inline preview under each post
  const previews = await Comment.aggregate([
    { $match: { post: { $in: page.map((p) => p._id) } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$post', comments: { $push: '$$ROOT' } } },
    { $project: { comments: { $slice: ['$comments', 2] } } },
  ]);
  await User.populate(previews, { path: 'comments.author', select: AUTHOR_FIELDS });
  const byPost = new Map(previews.map((p) => [String(p._id), p.comments.reverse()]));

  res.json({
    posts: page.map((p) => ({
      ...serializePost(p, req.user),
      previewComments: (byPost.get(String(p._id)) || []).map((c) => serializeComment(c, req.user, p.author._id)),
    })),
    hasMore: posts.length > FEED_PAGE,
    nextCursor: page.length ? page[page.length - 1].createdAt : null,
  });
});

// GET /api/posts/explore?page=1  → popular posts from accounts I don't follow
router.get('/explore', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const docs = await Post.aggregate([
    { $match: { author: { $ne: req.user._id } } },
    { $addFields: { score: { $add: [{ $size: '$likes' }, { $multiply: ['$commentsCount', 2] }] } } },
    { $sort: { score: -1, createdAt: -1 } },
    { $skip: (page - 1) * GRID_PAGE },
    { $limit: GRID_PAGE + 1 },
  ]);
  const posts = await Post.populate(docs.map((d) => Post.hydrate(d)), { path: 'author', select: AUTHOR_FIELDS });
  res.json({
    posts: posts.slice(0, GRID_PAGE).map((p) => serializePost(p, req.user)),
    hasMore: posts.length > GRID_PAGE,
  });
});

// GET /api/posts/tag/:tag?page=1  → posts with a hashtag
router.get('/tag/:tag', async (req, res) => {
  const tag = req.params.tag.toLowerCase();
  const page = Math.max(Number(req.query.page) || 1, 1);
  const [total, posts] = await Promise.all([
    Post.countDocuments({ hashtags: tag }),
    Post.find({ hashtags: tag })
      .sort({ createdAt: -1 })
      .skip((page - 1) * GRID_PAGE)
      .limit(GRID_PAGE + 1)
      .populate('author', AUTHOR_FIELDS),
  ]);
  res.json({
    tag,
    total,
    posts: posts.slice(0, GRID_PAGE).map((p) => serializePost(p, req.user)),
    hasMore: posts.length > GRID_PAGE,
  });
});

// POST /api/posts  (multipart: images[] + caption, location, hideLikes, commentsOff)
router.post('/', upload.array('images', 10), async (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'Select at least one photo to share.');
  const caption = String(req.body.caption || '').trim();
  const post = await Post.create({
    author: req.user._id,
    images: req.files.map(fileUrl),
    caption,
    location: String(req.body.location || '').trim(),
    hashtags: Post.parseHashtags(caption),
    hideLikes: bool(req.body.hideLikes),
    commentsOff: bool(req.body.commentsOff),
  });
  await post.populate('author', AUTHOR_FIELDS);
  res.status(201).json({ post: serializePost(post, req.user) });
});

// GET /api/posts/:id
router.get('/:id', async (req, res) => {
  const post = await findPost(req.params.id);
  res.json({ post: serializePost(post, req.user) });
});

// PUT /api/posts/:id  → edit caption / location / settings
router.put('/:id', async (req, res) => {
  const post = await findPost(req.params.id);
  if (!post.author._id.equals(req.user._id)) throw new HttpError(403, 'You can only edit your own posts.');
  const { caption, location, hideLikes, commentsOff } = req.body;
  if (caption !== undefined) {
    post.caption = String(caption).trim();
    post.hashtags = Post.parseHashtags(post.caption);
    post.editedAt = new Date();
  }
  if (location !== undefined) post.location = String(location).trim();
  if (hideLikes !== undefined) post.hideLikes = bool(hideLikes);
  if (commentsOff !== undefined) post.commentsOff = bool(commentsOff);
  await post.save();
  res.json({ post: serializePost(post, req.user) });
});

// DELETE /api/posts/:id
router.delete('/:id', async (req, res) => {
  const post = await findPost(req.params.id);
  if (!post.author._id.equals(req.user._id)) throw new HttpError(403, 'You can only delete your own posts.');
  await Promise.all([
    Comment.deleteMany({ post: post._id }),
    Notification.deleteMany({ post: post._id }),
    User.updateMany({ saved: post._id }, { $pull: { saved: post._id } }),
    post.deleteOne(),
  ]);
  post.images.forEach(removeUpload);
  res.json({ ok: true });
});

// PUT /api/posts/:id/like  &  DELETE /api/posts/:id/like
// (idempotent like / unlike so a double-tap never accidentally un-likes)
router.put('/:id/like', async (req, res) => {
  const post = await findPost(req.params.id);
  const res1 = await Post.updateOne({ _id: post._id }, { $addToSet: { likes: req.user._id } });
  if (res1.modifiedCount) await Notification.notify({ recipient: post.author._id, sender: req.user._id, type: 'like', post: post._id });
  const { likes } = await Post.findById(post._id, 'likes');
  res.json({ isLiked: true, likesCount: likes.length });
});

router.delete('/:id/like', async (req, res) => {
  const post = await findPost(req.params.id);
  await Post.updateOne({ _id: post._id }, { $pull: { likes: req.user._id } });
  await Notification.unnotify({ recipient: post.author._id, sender: req.user._id, type: 'like', post: post._id });
  const { likes } = await Post.findById(post._id, 'likes');
  res.json({ isLiked: false, likesCount: likes.length });
});

// GET /api/posts/:id/likes  → who liked a post
router.get('/:id/likes', async (req, res) => {
  const post = await Post.findById(req.params.id, 'likes').populate('likes', AUTHOR_FIELDS);
  if (!post) throw new HttpError(404, 'This post is no longer available.');
  res.json({ users: post.likes.reverse().map((u) => userRow(u, req.user)) });
});

// PUT /api/posts/:id/save  &  DELETE /api/posts/:id/save  → bookmarks
router.put('/:id/save', async (req, res) => {
  await findPost(req.params.id);
  // Re-add to the front so the newest saved post appears first
  await User.updateOne({ _id: req.user._id }, { $pull: { saved: req.params.id } });
  await User.updateOne({ _id: req.user._id }, { $push: { saved: { $each: [req.params.id], $position: 0 } } });
  res.json({ isSaved: true });
});

router.delete('/:id/save', async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { saved: req.params.id } });
  res.json({ isSaved: false });
});

// GET /api/posts/:id/comments  → oldest first, like Instagram
router.get('/:id/comments', async (req, res) => {
  const post = await Post.findById(req.params.id, 'author');
  if (!post) throw new HttpError(404, 'This post is no longer available.');
  const comments = await Comment.find({ post: post._id }).sort({ createdAt: 1 }).populate('author', AUTHOR_FIELDS);
  res.json({ comments: comments.map((c) => serializeComment(c, req.user, post.author)) });
});

// POST /api/posts/:id/comments  { text }
router.post('/:id/comments', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new HttpError(404, 'This post is no longer available.');
  if (post.commentsOff && !post.author.equals(req.user._id)) throw new HttpError(403, 'Commenting has been turned off.');
  const text = String(req.body.text || '').trim();
  if (!text) throw new HttpError(400, 'Write a comment first.');

  const comment = await Comment.create({ post: post._id, author: req.user._id, text });
  await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });
  await Notification.notify({ recipient: post.author, sender: req.user._id, type: 'comment', post: post._id, comment: comment._id, text: text.slice(0, 100) });

  await comment.populate('author', AUTHOR_FIELDS);
  res.status(201).json({ comment: serializeComment(comment, req.user, post.author) });
});

module.exports = router;
