require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');

// Use Google DNS — fixes querySrv ECONNREFUSED on many Windows networks
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const connectOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4
};

async function tryConnect(uri, label) {
  if (!uri) return null;
  console.log(`Trying ${label}...`);
  await mongoose.connect(uri, connectOptions);
  console.log(`Connected via ${label}`);
  return mongoose.connection;
}

/**
 * Connect to MongoDB Atlas — tries multiple methods automatically
 */
async function connectDB() {
  const srvUri = process.env.MONGODB_URI;
  const directUri = process.env.MONGODB_URI_DIRECT;

  if (!srvUri && !directUri) {
    throw new Error('MONGODB_URI not set in .env file');
  }

  const attempts = [
    { uri: srvUri, label: 'SRV connection' },
    { uri: directUri, label: 'direct connection' }
  ];

  let lastError = null;

  for (const { uri, label } of attempts) {
    if (!uri) continue;
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      return await tryConnect(uri, label);
    } catch (err) {
      lastError = err;
      console.log(`${label} failed: ${err.message}`);
    }
  }

  const msg = lastError?.message || 'Unknown error';
  throw new Error(
    `Could not connect to MongoDB Atlas.\n${msg}\n\n` +
    'Checklist:\n' +
    '1. Atlas → Network Access → add 0.0.0.0/0\n' +
    '2. Atlas → Database Access → verify username/password\n' +
    '3. .env password: encode @ as %40\n' +
    '4. Run: node test-db.js'
  );
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB Atlas');
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  isConnected,
  mongoose
};
