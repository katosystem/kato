const { connectDB, mongoose } = require('./db');

const passSchema = new mongoose.Schema({
  srno: { type: String, required: true },
  vehicleno: { type: String, required: true },
  material: String,
  roypass: String,
  grosswt: { type: Number, default: 0 },
  tarewt: { type: Number, default: 0 },
  netwt: { type: Number, default: 0 },
  pass_date: String,
  pass_time: String,
  note: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const Pass = mongoose.model('Pass', passSchema);
const User = mongoose.model('User', userSchema);

function formatPass(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    srno: obj.srno,
    vehicleno: obj.vehicleno,
    material: obj.material || '',
    roypass: obj.roypass || '',
    grosswt: obj.grosswt || 0,
    tarewt: obj.tarewt || 0,
    netwt: obj.netwt || 0,
    pass_date: obj.pass_date || '',
    pass_time: obj.pass_time || '',
    note: obj.note || '',
    created_at: obj.created_at
  };
}

async function initDatabase() {
  await connectDB();

  let user1 = await User.findOne({ username: 'shiv' });
  if (!user1) {
    await User.create({ username: 'shiv', password: '6565' });
    console.log('Default user created: shiv / 6565');
  }

  let user2 = await User.findOne({ username: 'shivbhumi' });
  if (!user2) {
    await User.create({ username: 'shivbhumi', password: '6565' });
    console.log('Default user created: shivbhumi / 6565');
  }
}

async function getStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [total, today, netResult, vehicles] = await Promise.all([
    Pass.countDocuments(),
    Pass.countDocuments({ created_at: { $gte: startOfToday, $lte: endOfToday } }),
    Pass.aggregate([{ $group: { _id: null, sum: { $sum: '$netwt' } } }]),
    Pass.distinct('vehicleno')
  ]);

  const totalNet = netResult[0]?.sum || 0;

  return {
    total,
    today,
    totalNet: Number(Number(totalNet).toFixed(3)),
    vehicles: vehicles.length
  };
}

async function getAllPasses(search, month) {
  let query = {};
  const conditions = [];

  if (search) {
    const regex = new RegExp(search, 'i');
    conditions.push({
      $or: [
        { srno: regex },
        { vehicleno: regex },
        { material: regex },
        { roypass: regex },
        { note: regex }
      ]
    });
  }

  if (month) {
    const monthRegex = new RegExp('^' + month);
    conditions.push({ pass_date: monthRegex });
  }

  if (conditions.length > 0) {
    query = conditions.length === 1 ? conditions[0] : { $and: conditions };
  }

  const passes = await Pass.find(query).sort({ created_at: -1 });
  return passes.map(formatPass);
}

async function getPassById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const pass = await Pass.findById(id);
  return formatPass(pass);
}

async function createPass(data) {
  const pass = await Pass.create({
    srno: data.srno,
    vehicleno: data.vehicleno,
    material: data.material || '',
    roypass: data.roypass || '',
    grosswt: data.grosswt || 0,
    tarewt: data.tarewt || 0,
    netwt: data.netwt || 0,
    pass_date: data.pass_date || '',
    pass_time: data.pass_time || '',
    note: data.note || ''
  });
  return formatPass(pass);
}

async function deletePass(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return;
  await Pass.findByIdAndDelete(id);
}

async function validateUser(username, password) {
  const user = await User.findOne({ username, password });
  return !!user;
}

async function getRecentByMaterial() {
  return Pass.aggregate([
    { $group: {
      _id: '$material',
      count: { $sum: 1 },
      total_net: { $sum: '$netwt' }
    }},
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: {
      material: { $ifNull: ['$_id', 'Unknown'] },
      count: 1,
      total_net: 1,
      _id: 0
    }}
  ]);
}

module.exports = {
  initDatabase,
  getStats,
  getAllPasses,
  getPassById,
  createPass,
  deletePass,
  validateUser,
  getRecentByMaterial
};
