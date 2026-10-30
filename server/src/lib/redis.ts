import IORedis from "ioredis";

export const redis = new IORedis(process.env.REDIS_URL!, {
  // Required by BullMQ: commands must wait in the queue instead of failing
  // when Redis reconnects.
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 500, 10_000),
});
