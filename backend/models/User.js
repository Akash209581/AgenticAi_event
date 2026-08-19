import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    aiId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true  // Ensure consistent casing for fast exact-match lookups
    },
    name: {
      type: String,
      required: [true, 'Name is mandatory'],
      trim: true
    },
    dob: {
      type: String,
      required: [true, 'Date of Birth (DOB) is mandatory'],
      trim: true
    },
    regNo: {
      type: String,
      required: [true, 'Registration Number is mandatory'],
      unique: true,
      trim: true,
      uppercase: true  // Normalize at schema level for fast exact-match lookups
    },
    year: {
      type: String,
      required: [true, 'Year is mandatory'],
      enum: ['1', '2', '3', '4', 'M.Tech (1st year)', 'M.Tech (2nd year)'],
      trim: true
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Unspecified'],
      default: 'Unspecified',
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone Number is mandatory'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: 'Phone number must consist of strictly 10 numerical digits'
      }
    },
    email: {
      type: String,
      required: [true, 'Email Id is mandatory'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is mandatory']
    },
    registeredEvents: {
      type: Array,
      default: []
    }
  },
  {
    timestamps: true
  }
);

// -------------------------------------------------------------------
// Compound index for the 3-field $or login/lookup query.
// These three fields cover all login identifier combinations.
// Normalizing to uppercase (aiId, regNo) + lowercase (email) at save
// time means lookups are simple exact-match → index is always used.
// -------------------------------------------------------------------
userSchema.index({ email: 1 });
userSchema.index({ regNo: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ aiId: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
