import { Queue } from "bullmq";
import { redis } from "../lib/redis";

const aiQueue = new Queue("noti-operation", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 24 * 3600,
    },
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export { aiQueue };
