const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_WORK_FACTOR = 10;

const PendingUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  // Fields for Binance credentials
  binanceKey:    { type: String },
  binanceSecret: { type: String },
  // Optionally include password if needed, or other fields
  password: { type: String }
  // other fields...
});

// If you need password hashing for pending users, include it. If not, you can omit the pre-save hook.
PendingUserSchema.pre('save', async function(next) {
  if (this.password && this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
      this.password = await bcrypt.hash(this.password, salt);
      return next();
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Optional: Add a compare method if you plan to use it.
PendingUserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Export the model under a unique name ("PendingUser")
module.exports = mongoose.models.PendingUser || mongoose.model('PendingUser', PendingUserSchema);
