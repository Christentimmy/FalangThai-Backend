import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();


const redisClient = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_URL,
        port: Number(process.env.REDIS_PORT),
    }
});

// Connect to Redis
async function connectRedis() {
  try {
    await redisClient.connect();
    console.log('Redis client connected');
  } catch (err) {
    console.error('Redis connection error:', err);
  }
}

connectRedis();

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export default redisClient;
