import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    aiId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
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
      trim: true
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

export const User = mongoose.models.User || mongoose.model('User', userSchema);
