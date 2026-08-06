import { Counter } from '../models/Counter.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

/**
 * In-Memory Request Queue for Thread-Safe Sequential ID Generation
 * Prevents NodeJS event-loop race conditions when handling simultaneous HTTP requests.
 */
class IdGenerationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async enqueue(generatorFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({ generatorFunction, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const { generatorFunction, resolve, reject } = this.queue.shift();
      try {
        const result = await generatorFunction();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    this.processing = false;
  }
}

const aiIdQueue = new IdGenerationQueue();
let fallbackCounter = 0;
export const memoryUsers = []; // In-memory store fallback if Mongo connection is absent

/**
 * Generates sequential AI Registration ID (e.g. AI00001, AI00002)
 * Queue-protected and MongoDB $inc atomic counter driven.
 */
export async function generateAiId() {
  return aiIdQueue.enqueue(async () => {
    // Check if Mongoose is connected to MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const counter = await Counter.findOneAndUpdate(
          { _id: 'aiDayUserId' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const nextSeq = counter.seq;
        return `AI${nextSeq.toString().padStart(5, '0')}`;
      } catch (err) {
        console.warn('[ID Generator Warning] Mongo Counter error, computing from max User ID:', err.message);
      }
    }

    // Fallback mode if MongoDB service is offline or recovering
    fallbackCounter++;
    const maxExistingInMemory = memoryUsers.length;
    const currentSeq = Math.max(fallbackCounter, maxExistingInMemory);
    fallbackCounter = currentSeq;
    return `AI${currentSeq.toString().padStart(5, '0')}`;
  });
}
