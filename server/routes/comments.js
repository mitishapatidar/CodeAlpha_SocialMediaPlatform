const router = require('express').Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../utils/errors');

router.use(requireAuth);

async function findComment(id) {
  const comment = await Comment.findById(id);
  if (!comment) throw new HttpError(404, 'This comment was deleted.');
  return comment;
}

// DELETE /api/comments/:id  → by the comment's author or the post's author
router.delete('/:id', async (req, res) => {
  const comment = await findComment(req.params.id);
  const post = await Post.findById(comment.post, 'author');
  const allowed = comment.author.equals(req.user._id) || post?.author.equals(req.user._id);
  if (!allowed) throw new HttpError(403, "You can't delete this comment.");

  await comment.deleteOne();
  await Notification.deleteMany({ comment: comment._id });
  if (post) await Post.updateOne({ _id: post._id, commentsCount: { $gt: 0 } }, { $inc: { commentsCount: -1 } });
  res.json({ ok: true });
});

// PUT /api/comments/:id/like  &  DELETE /api/comments/:id/like
router.put('/:id/like', async (req, res) => {
  const comment = await findComment(req.params.id);
  const r = await Comment.updateOne({ _id: comment._id }, { $addToSet: { likes: req.user._id } });
  if (r.modifiedCount)
    await Notification.notify({ recipient: comment.author, sender: req.user._id, type: 'comment_like', post: comment.post, comment: comment._id, text: comment.text.slice(0, 100) });
  const { likes } = await Comment.findById(comment._id, 'likes');
  res.json({ isLiked: true, likesCount: likes.length });
});

router.delete('/:id/like', async (req, res) => {
  const comment = await findComment(req.params.id);
  await Comment.updateOne({ _id: comment._id }, { $pull: { likes: req.user._id } });
  await Notification.unnotify({ recipient: comment.author, sender: req.user._id, type: 'comment_like', comment: comment._id });
  const { likes } = await Comment.findById(comment._id, 'likes');
  res.json({ isLiked: false, likesCount: likes.length });
});

module.exports = router;
