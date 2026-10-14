/** Fields of an author that are safe/handy to embed in posts, comments etc. */
const AUTHOR_FIELDS = 'username fullName avatar isVerified';

const idIn = (list = [], id) => !!id && list.some((x) => String(x) === String(id));

function userLite(user) {
  if (!user) return null;
  return {
    _id: user._id,
    username: user.username,
    fullName: user.fullName,
    avatar: user.avatar,
    isVerified: user.isVerified,
  };
}

/**
 * Shapes a post for the client relative to the viewer.
 * `viewer` is the logged-in User document (needed for isSaved / isFollowing).
 */
function serializePost(post, viewer) {
  const viewerId = viewer?._id;
  const authorId = post.author?._id || post.author;
  return {
    _id: post._id,
    author: userLite(post.author),
    images: post.images,
    caption: post.caption,
    location: post.location,
    hashtags: post.hashtags,
    likesCount: post.likes.length,
    commentsCount: post.commentsCount,
    hideLikes: post.hideLikes,
    commentsOff: post.commentsOff,
    isLiked: idIn(post.likes, viewerId),
    isSaved: idIn(viewer?.saved, post._id),
    isMine: String(authorId) === String(viewerId),
    isFollowingAuthor: idIn(viewer?.following, authorId),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function serializeComment(comment, viewer, postAuthorId) {
  const viewerId = viewer?._id;
  const authorId = comment.author?._id || comment.author;
  return {
    _id: comment._id,
    post: comment.post,
    author: userLite(comment.author),
    text: comment.text,
    likesCount: comment.likes.length,
    isLiked: idIn(comment.likes, viewerId),
    // Comment authors and the post's author may delete a comment
    canDelete: String(authorId) === String(viewerId) || String(postAuthorId) === String(viewerId),
    createdAt: comment.createdAt,
  };
}

/** A user row in lists (followers, likes, search...) with follow state. */
function userRow(user, viewer) {
  return {
    ...userLite(user),
    isFollowing: idIn(viewer?.following, user._id),
    isMe: String(user._id) === String(viewer?._id),
  };
}

module.exports = { AUTHOR_FIELDS, idIn, userLite, serializePost, serializeComment, userRow };
