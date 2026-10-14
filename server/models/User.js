const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9._]+$/, 'Usernames can only use letters, numbers, underscores and periods.'],
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    fullName: { type: String, trim: true, maxlength: 60, default: '' },
    bio: { type: String, maxlength: 150, default: '' },
    website: { type: String, maxlength: 100, default: '' },
    gender: { type: String, enum: ['', 'female', 'male', 'custom', 'prefer_not'], default: '' },
    avatar: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  },
  { timestamps: true }
);

userSchema.index({ fullName: 'text', username: 'text' });

/** Public shape of a user, relative to the viewer (who may be null). */
userSchema.methods.toProfile = function (viewerId) {
  const viewer = viewerId ? String(viewerId) : null;
  return {
    _id: this._id,
    username: this.username,
    fullName: this.fullName,
    bio: this.bio,
    website: this.website,
    avatar: this.avatar,
    isVerified: this.isVerified,
    followersCount: this.followers.length,
    followingCount: this.following.length,
    isFollowing: viewer ? this.followers.some((id) => String(id) === viewer) : false,
    followsYou: viewer ? this.following.some((id) => String(id) === viewer) : false,
    isMe: viewer === String(this._id),
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
