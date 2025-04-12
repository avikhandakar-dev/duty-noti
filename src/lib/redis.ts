import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const redisCache = new Redis(process.env.REDIS_URL_CACHE!, {
  maxRetriesPerRequest: null,
});
