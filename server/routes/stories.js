const router = require('express').Router();
const Story = require('../models/Story');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { upload, fileUrl } = require('../middleware/upload');
const { HttpError, removeUpload } = require('../utils/errors');
const { AUTHOR_FIELDS, idIn, userLite, userRow } = require('../utils/serialize');

router.use(requireAuth);

// The TTL index removes expired stories eventually; this filter hides them immediately
const active = () => ({ expiresAt: { $gt: new Date() } });

function serializeStory(story, viewer) {
  return {
    _id: story._id,
    image: story.image,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    seen: idIn(story.viewers, viewer._id),
    viewersCount: String(story.author._id || story.author) === String(viewer._id) ? story.viewers.length : undefined,
  };
}

// GET /api/stories  → the story tray: me first, then people I follow (unseen first)
router.get('/', async (req, res) => {
  const me = req.user;
  const stories = await Story.find({ ...active(), author: { $in: [me._id, ...me.following] } })
    .sort({ createdAt: 1 })
    .populate('author', AUTHOR_FIELDS);

  const groups = new Map();
  for (const s of stories) {
    const key = String(s.author._id);
    if (!groups.has(key)) groups.set(key, { user: userLite(s.author), stories: [] });
    groups.get(key).stories.push(serializeStory(s, me));
  }

  const tray = [...groups.values()].map((g) => ({
    ...g,
    hasUnseen: g.stories.some((s) => !s.seen),
    latest: g.stories[g.stories.length - 1].createdAt,
    isMe: String(g.user._id) === String(me._id),
  }));
  tray.sort((a, b) => b.isMe - a.isMe || b.hasUnseen - a.hasUnseen || new Date(b.latest) - new Date(a.latest));

  res.json({ tray, me: { ...userLite(me), hasStory: tray[0]?.isMe || false } });
});

// GET /api/stories/user/:username  → one user's active stories
router.get('/user/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }, AUTHOR_FIELDS);
  if (!user) throw new HttpError(404, 'User not found.');
  const stories = await Story.find({ ...active(), author: user._id }).sort({ createdAt: 1 });
  res.json({ user: userLite(user), stories: stories.map((s) => serializeStory(s, req.user)) });
});

// POST /api/stories  (multipart field "image")
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose a photo for your story.');
  const story = await Story.create({ author: req.user._id, image: fileUrl(req.file) });
  res.status(201).json({ story: serializeStory(story, req.user) });
});

// POST /api/stories/:id/view  → mark as seen
router.post('/:id/view', async (req, res) => {
  await Story.updateOne({ _id: req.params.id, author: { $ne: req.user._id } }, { $addToSet: { viewers: req.user._id } });
  res.json({ ok: true });
});

// GET /api/stories/:id/viewers  → only for the story's author
router.get('/:id/viewers', async (req, res) => {
  const story = await Story.findById(req.params.id).populate('viewers', AUTHOR_FIELDS);
  if (!story) throw new HttpError(404, 'Story not found.');
  if (!story.author.equals(req.user._id)) throw new HttpError(403, 'Only the author can see viewers.');
  res.json({ users: story.viewers.map((u) => userRow(u, req.user)) });
});

// DELETE /api/stories/:id
router.delete('/:id', async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) throw new HttpError(404, 'Story not found.');
  if (!story.author.equals(req.user._id)) throw new HttpError(403, 'You can only delete your own stories.');
  await story.deleteOne();
  removeUpload(story.image);
  res.json({ ok: true });
});

module.exports = router;
