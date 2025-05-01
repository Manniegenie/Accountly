const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
  username:      { type: String, required: true },
  email:         { type: String, required: true, unique: true },
  password:      { type: String, required: true },
  binanceKey:    { type: String },
  binanceSecret: { type: String },
  monoAccountId: { type: mongoose.Schema.Types.Mixed }, // can be array or string
  lastSyncedAt:  { type: Date, default: null } // 🆕 added for Mono sync tracking
});

// Password hashing
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
