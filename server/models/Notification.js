const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'comment', 'follow', 'comment_like'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    text: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** Creates a notification unless the user is acting on their own content. */
notificationSchema.statics.notify = async function ({ recipient, sender, type, post, comment, text }) {
  if (String(recipient) === String(sender)) return null;
  return this.create({ recipient, sender, type, post, comment, text });
};

/** Removes a notification when the action is undone (unlike, unfollow...). */
notificationSchema.statics.unnotify = function ({ recipient, sender, type, post, comment }) {
  const filter = { recipient, sender, type };
  if (post) filter.post = post;
  if (comment) filter.comment = comment;
  return this.deleteMany(filter);
};

module.exports = mongoose.model('Notification', notificationSchema);
