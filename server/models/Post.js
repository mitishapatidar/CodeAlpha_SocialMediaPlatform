const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    images: {
      type: [String],
      validate: [(arr) => arr.length >= 1 && arr.length <= 10, 'A post needs 1–10 images.'],
    },
    caption: { type: String, maxlength: 2200, default: '' },
    location: { type: String, maxlength: 100, default: '' },
    hashtags: [{ type: String, lowercase: true, index: true }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    hideLikes: { type: Boolean, default: false },
    commentsOff: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

/** Extracts #hashtags from a caption. */
postSchema.statics.parseHashtags = (caption = '') =>
  [...new Set((caption.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1).toLowerCase()))];

module.exports = mongoose.model('Post', postSchema);
