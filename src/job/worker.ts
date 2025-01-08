import { Worker } from "bullmq";
import { redis } from "../lib/redis";
import { AIOperationTypes } from "./jobTypes";
import { nanoid } from "nanoid";
import { addToAIQueue } from "./aiService";

interface Workers {
  init: () => void;
}

const workers: Workers = {
  init: () => {
    aiWorker.run();
  },
};

const aiWorker = new Worker(
  "noti-operation",
  async (job) => {
    try {
      const data = job.data;
      console.log(data);

      const type = data.queueType;

      if (!AIOperationTypes.includes(type)) {
        throw new Error(`Invalid type ${type} for job ${job.id}`);
      }
      const aiFunction = addToAIQueue(type);
      await aiFunction(data);
    } catch (error: any) {
      console.log(error.message);
      await job.moveToFailed(new Error(error.message), `${nanoid()}`, false);
    }
  },
  {
    connection: redis,
    autorun: false,
    lockDuration: 30000,
    concurrency: 1,
  }
)
  .on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
  })
  .on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed with error: ${error.message}`);
  });

export { workers };
