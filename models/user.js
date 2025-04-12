// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
  username:      { type: String, required: true },
  email:         { type: String, required: true, unique: true },
  binanceKey:    { type: String },
  binanceSecret: { type: String },
  password:      { type: String, required: true },
  // other fields...
});

// Pre-save hook to hash the password before saving.
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare a provided password with the stored hash.
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
