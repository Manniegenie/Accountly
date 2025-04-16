const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
  username:      { type: String, required: true },
  email:         { type: String, required: true, unique: true },

  // Unique, but sparse: avoids conflicts if not set
  binanceKey:    { type: String, unique: true, sparse: true },
  binanceSecret: { type: String, unique: true, sparse: true },

  monoAccountId: { type: String },
  password:      { type: String, required: true }
});

// Expose virtual userId
UserSchema.virtual('userId').get(function () {
  return this._id.toHexString();
});

// Enable virtuals in JSON output
UserSchema.set('toJSON', {
  virtuals: true
});

// Password hashing middleware
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

// Password comparison method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
