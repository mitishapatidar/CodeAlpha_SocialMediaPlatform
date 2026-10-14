const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let memoryServer = null;

/**
 * Connects to MongoDB.
 * - If MONGO_URI is set (local MongoDB / Atlas), it is used directly.
 * - Otherwise a local MongoDB binary is started via mongodb-memory-server,
 *   persisting data to ./.data so nothing is lost between restarts.
 */
async function connectDB() {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbPath = path.join(__dirname, '..', '..', '.data', 'db');
    fs.mkdirSync(dbPath, { recursive: true });
    console.log('⏳ MONGO_URI not set — starting built-in local MongoDB (first run downloads the binary)...');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger', port: 27027 },
    });
    uri = memoryServer.getUri('instaclone');
  }

  await mongoose.connect(uri);
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop({ doCleanup: false });
}

module.exports = { connectDB, disconnectDB };
