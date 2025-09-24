import * as dotenv from 'dotenv';
import path from 'path';
import { Redis } from '@upstash/redis';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Test Redis connection
async function testRedis() {
  try {
    console.log('🔄 Testing Redis connection...');
    console.log('URL:', process.env.UPSTASH_REDIS_REST_URL);
    console.log('Token:', process.env.UPSTASH_REDIS_REST_TOKEN?.substring(0, 20) + '...');
    
    // Remove quotes from env values
    const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g, '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g, '');
    
    const redis = new Redis({
      url: url!,
      token: token!,
    });

    // Test 1: Set a value
    await redis.set('test:key', 'Hello Rankup!');
    console.log('✅ Set value successful');

    // Test 2: Get the value
    const value = await redis.get('test:key');
    console.log('✅ Get value:', value);

    // Test 3: Set with TTL
    await redis.setex('test:ttl', 60, 'Expires in 60 seconds');
    console.log('✅ Set with TTL successful');

    // Test 4: Increment counter
    const count = await redis.incr('test:counter');
    console.log('✅ Counter value:', count);

    // Test 5: List operations
    await redis.lpush('test:list', 'item1', 'item2', 'item3');
    const list = await redis.lrange('test:list', 0, -1);
    console.log('✅ List values:', list);

    // Cleanup
    await redis.del('test:key', 'test:ttl', 'test:counter', 'test:list');
    console.log('✅ Cleanup completed');

    console.log('\n🎉 Redis connection test PASSED!');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
  }
}

testRedis();