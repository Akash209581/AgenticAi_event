import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
  aiId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  regNo: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  section: { type: String, trim: true, default: '' },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  isLeader: { type: Boolean, default: false }
});

const projectDetailsSchema = new mongoose.Schema(
  {
    agentName: { type: String, trim: true, default: '' },
    problemStatement: { type: String, trim: true, default: '' },
    targetUsers: { type: String, trim: true, default: '' },
    userInput: { type: String, trim: true, default: '' },
    informationUsed: { type: String, trim: true, default: '' },
    decisionsMade: { type: String, trim: true, default: '' },
    toolsNeeded: { type: String, trim: true, default: '' },
    stepByStepWorkflow: { type: String, trim: true, default: '' },
    finalResult: { type: String, trim: true, default: '' },
    successMetrics: { type: String, trim: true, default: '' },
    failureModesAndChecks: { type: String, trim: true, default: '' },
    githubLink: { type: String, trim: true, default: '' },
    demoLink: { type: String, trim: true, default: '' },
    updatedBy: { type: String, trim: true, default: '' },
    updatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

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
    },
    projectDetails: {
      type: projectDetailsSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

teamSchema.index({ 'members.aiId': 1 });

export const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

