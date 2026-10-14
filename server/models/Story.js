const mongoose = require('mongoose');

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

const storySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    image: { type: String, required: true },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // MongoDB's TTL index deletes the story automatically once this date passes
    expiresAt: { type: Date, default: () => new Date(Date.now() + STORY_LIFETIME_MS), index: { expires: 0 } },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Story', storySchema);
