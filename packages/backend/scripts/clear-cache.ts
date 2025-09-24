import * as dotenv from 'dotenv';
import path from 'path';
import { Redis } from '@upstash/redis';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function clearCache() {
  try {
    console.log('🧹 Clearing Redis cache...\n');
    
    // List all keys
    const keys = await redis.keys('bigquery:*');
    console.log(`Found ${keys.length} cached queries`);
    
    if (keys.length > 0) {
      // Delete all BigQuery cache keys
      for (const key of keys) {
        await redis.del(key);
      }
      console.log(`✅ Deleted ${keys.length} cache entries`);
    }
    
    console.log('\n🔄 Cache cleared! Refresh your browser to see updated data.');
    
  } catch (error) {
    console.error('❌ Clear cache failed:', error);
  }
}

clearCache();