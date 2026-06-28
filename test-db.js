require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const opts = { serverSelectionTimeoutMS: 30000, family: 4 };

async function test(label, uri) {
  if (!uri) {
    console.log(`[SKIP] ${label} — not set`);
    return false;
  }
  try {
    await mongoose.connect(uri, opts);
    console.log(`[OK]   ${label}`);
    await mongoose.disconnect();
    return true;
  } catch (e) {
    console.log(`[FAIL] ${label}: ${e.message}`);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    return false;
  }
}

(async () => {
  console.log('=== MongoDB Atlas Connection Test ===\n');
  console.log('MONGODB_URI set:', !!process.env.MONGODB_URI);
  console.log('MONGODB_URI_DIRECT set:', !!process.env.MONGODB_URI_DIRECT);
  console.log('');

  const ok =
    await test('Direct connection', process.env.MONGODB_URI_DIRECT) ||
    await test('SRV connection', process.env.MONGODB_URI);

  console.log('');
  if (ok) {
    console.log('SUCCESS — Database connection works!');
    process.exit(0);
  } else {
    console.log('FAILED — Fix Atlas Network Access (add 0.0.0.0/0) and check password in .env');
    process.exit(1);
  }
})();
