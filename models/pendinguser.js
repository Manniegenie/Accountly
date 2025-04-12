const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  // Fields for Binance credentials
  binanceKey: { type: String },
  binanceSecret: { type: String },
  // Password field
  password: { type: String, required: true },
  // other fields...
});

// Pre-save hook to hash the password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt with the defined work factor
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    // Hash the password using the generated salt
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Method to compare a given password with the stored hash.
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
