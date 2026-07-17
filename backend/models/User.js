const mongoose = require('mongoose');

// A very small User schema. This is intentionally simple ("dummy/basic login")
// since the assignment only asks for basic authentication, not a full
// production-grade user management system.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String, // stored as a bcrypt hash, never plain text
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
