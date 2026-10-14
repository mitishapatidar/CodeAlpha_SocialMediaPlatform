const router = require('express').Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { AUTHOR_FIELDS, userRow } = require('../utils/serialize');

router.use(requireAuth);

// GET /api/notifications  → latest 50 activity items
router.get('/', async (req, res) => {
  const items = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', AUTHOR_FIELDS)
    .populate('post', 'images');

  res.json({
    notifications: items
      .filter((n) => n.sender) // sender account may have been removed
      .map((n) => ({
        _id: n._id,
        type: n.type,
        sender: userRow(n.sender, req.user),
        post: n.post ? { _id: n.post._id, image: n.post.images[0] } : null,
        text: n.text,
        read: n.read,
        createdAt: n.createdAt,
      })),
  });
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
  res.json({ count });
});

// PUT /api/notifications/read  → mark everything as read
router.put('/read', async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

module.exports = router;
