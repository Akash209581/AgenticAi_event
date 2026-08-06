import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agentic_ai_day', {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[MongoDB Connected] ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to local MongoDB (${error.message}).`);
    console.warn(`[MongoDB Warning] Using resilient in-memory fallback database mode.`);
    return false;
  }
};
