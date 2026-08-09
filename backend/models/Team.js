import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
  aiId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  regNo: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  isLeader: { type: Boolean, default: false }
});

const teamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    teamName: {
      type: String,
      required: [true, 'Team Name is mandatory'],
      trim: true
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    eventTitle: {
      type: String,
      required: true,
      trim: true
    },
    leaderAiId: {
      type: String,
      required: true,
      trim: true
    },
    members: {
      type: [teamMemberSchema],
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
