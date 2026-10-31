import IORedis from "ioredis";
export const redis = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 500, 10000),
});
