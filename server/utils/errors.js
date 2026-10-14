const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { UPLOAD_DIR } = require('../middleware/upload');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Deletes an uploaded file given its public /uploads/... URL (ignores missing files). */
function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  fs.unlink(file, () => {});
}

function notFound(req, res) {
  res.status(404).json({ message: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Clean up files multer saved for a request that then failed
  for (const f of req.files || (req.file ? [req.file] : [])) removeUpload(`/uploads/${f.filename}`);

  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';

  if (err instanceof multer.MulterError) {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Images must be smaller than 8 MB.';
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') message = 'You can upload up to 10 images.';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0]?.message || message;
  } else if (err.name === 'CastError') {
    status = 404;
    message = 'Not found.';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = field === 'username' ? 'This username isn\'t available.' : `Another account is using the same ${field}.`;
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ message });
}

module.exports = { HttpError, removeUpload, notFound, errorHandler };
