const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { requireAuth } = require('../middleware/auth');
const { AUTHOR_FIELDS, userRow } = require('../utils/serialize');

router.use(requireAuth);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/search?q=...  → matching accounts and hashtags
router.get('/', async (req, res) => {
  const raw = String(req.query.q || '').trim().toLowerCase();
  if (!raw) return res.json({ users: [], tags: [] });

  const isTag = raw.startsWith('#');
  const q = escapeRegex(raw.replace(/^[#@]/, ''));
  if (!q) return res.json({ users: [], tags: [] });

  const [users, tags] = await Promise.all([
    isTag
      ? []
      : User.find({ $or: [{ username: { $regex: `^${q}` } }, { username: { $regex: q } }, { fullName: { $regex: q, $options: 'i' } }] }, `${AUTHOR_FIELDS} followers`)
          .limit(40),
    Post.aggregate([
      { $unwind: '$hashtags' },
      { $match: { hashtags: { $regex: `^${q}` } } },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Rank: exact username, then username prefix, then people I follow, then follower count
  const following = new Set(req.user.following.map(String));
  const rank = (u) =>
    (u.username === raw ? 1000 : 0) +
    (u.username.startsWith(raw) ? 100 : 0) +
    (following.has(String(u._id)) ? 50 : 0) +
    Math.min(u.followers.length, 49);
  users.sort((a, b) => rank(b) - rank(a));

  res.json({
    users: users.slice(0, 20).map((u) => ({ ...userRow(u, req.user), followersCount: u.followers.length })),
    tags: tags.map((t) => ({ name: t._id, count: t.count })),
  });
});

module.exports = router;
