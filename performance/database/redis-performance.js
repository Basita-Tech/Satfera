/**
 * Redis Performance Testing Suite
 * Comprehensive Redis cache and session performance testing
 */

const Redis = require('redis');
const { performance } = require('perf_hooks');
require('dotenv').config();

class RedisPerformanceTester {
  constructor() {
    this.client = null;
    this.results = {
      connection: {},
      basicOperations: {},
      bulkOperations: {},
      concurrent: {},
      memory: {},
      expiration: {},
      dataStructures: {}
    };
  }

  async connect() {
    try {
      console.log('Connecting to Redis for performance testing...');
      
      const startTime = performance.now();
      this.client = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
        }
      });
      
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });
      
      await this.client.connect();
      const endTime = performance.now();
      
      this.results.connection.connectionTime = endTime - startTime;
      console.log(`✅ Connected to Redis in ${this.results.connection.connectionTime.toFixed(2)}ms`);
      
      // Test basic connectivity
      await this.testBasicConnectivity();
      
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      throw error;
    }
  }

  async testBasicConnectivity() {
    const pingStart = performance.now();
    const pong = await this.client.ping();
    const pingEnd = performance.now();
    
    this.results.connection.pingTime = pingEnd - pingStart;
    console.log(`✅ Redis ping: ${this.results.connection.pingTime.toFixed(2)}ms`);
  }

  async testBasicOperations() {
    console.log('\\n🔄 Testing basic Redis operations...');
    
    // SET operation
    const setStart = performance.now();
    await this.client.set('perf:test:key', 'test_value');
    const setEnd = performance.now();
    this.results.basicOperations.set = setEnd - setStart;
    
    // GET operation
    const getStart = performance.now();
    const value = await this.client.get('perf:test:key');
    const getEnd = performance.now();
    this.results.basicOperations.get = getEnd - getStart;
    
    // EXISTS operation
    const existsStart = performance.now();
    const exists = await this.client.exists('perf:test:key');
    const existsEnd = performance.now();
    this.results.basicOperations.exists = existsEnd - existsStart;
    
    // DELETE operation
    const delStart = performance.now();
    await this.client.del('perf:test:key');
    const delEnd = performance.now();
    this.results.basicOperations.del = delEnd - delStart;
    
    // INCR operation (for counters)
    const incrStart = performance.now();
    await this.client.incr('perf:counter');
    const incrEnd = performance.now();
    this.results.basicOperations.incr = incrEnd - incrStart;
    
    console.log(`✅ Basic operations completed:`);
    console.log(`   SET: ${this.results.basicOperations.set.toFixed(2)}ms`);
    console.log(`   GET: ${this.results.basicOperations.get.toFixed(2)}ms`);
    console.log(`   EXISTS: ${this.results.basicOperations.exists.toFixed(2)}ms`);
    console.log(`   DEL: ${this.results.basicOperations.del.toFixed(2)}ms`);
    console.log(`   INCR: ${this.results.basicOperations.incr.toFixed(2)}ms`);
  }

  async testBulkOperations() {
    console.log('\\n📦 Testing bulk operations...');
    
    // Bulk SET operations using pipeline
    const pipeline = this.client.multi();
    const bulkCount = 1000;
    
    for (let i = 0; i < bulkCount; i++) {
      pipeline.set(`perf:bulk:${i}`, `value_${i}`);
    }
    
    const bulkSetStart = performance.now();
    await pipeline.exec();
    const bulkSetEnd = performance.now();
    
    this.results.bulkOperations.bulkSet = {
      count: bulkCount,
      totalTime: bulkSetEnd - bulkSetStart,
      averageTime: (bulkSetEnd - bulkSetStart) / bulkCount
    };
    
    // Bulk GET operations
    const getPromises = [];
    const bulkGetStart = performance.now();
    
    for (let i = 0; i < bulkCount; i++) {
      getPromises.push(this.client.get(`perf:bulk:${i}`));
    }
    
    await Promise.all(getPromises);
    const bulkGetEnd = performance.now();
    
    this.results.bulkOperations.bulkGet = {
      count: bulkCount,
      totalTime: bulkGetEnd - bulkGetStart,
      averageTime: (bulkGetEnd - bulkGetStart) / bulkCount
    };
    
    // Bulk DELETE using pipeline
    const deletePipeline = this.client.multi();
    for (let i = 0; i < bulkCount; i++) {
      deletePipeline.del(`perf:bulk:${i}`);
    }
    
    const bulkDelStart = performance.now();
    await deletePipeline.exec();
    const bulkDelEnd = performance.now();
    
    this.results.bulkOperations.bulkDel = {
      count: bulkCount,
      totalTime: bulkDelEnd - bulkDelStart,
      averageTime: (bulkDelEnd - bulkDelStart) / bulkCount
    };
    
    console.log(`✅ Bulk operations completed:`);
    console.log(`   Bulk SET (${bulkCount}): ${this.results.bulkOperations.bulkSet.totalTime.toFixed(2)}ms`);
    console.log(`   Bulk GET (${bulkCount}): ${this.results.bulkOperations.bulkGet.totalTime.toFixed(2)}ms`);
    console.log(`   Bulk DEL (${bulkCount}): ${this.results.bulkOperations.bulkDel.totalTime.toFixed(2)}ms`);
  }

  async testConcurrentOperations() {
    console.log('\\n🔄 Testing concurrent operations...');
    
    const concurrentCount = 100;
    const operations = [];
    
    const concurrentStart = performance.now();
    
    // Mix of different concurrent operations
    for (let i = 0; i < concurrentCount; i++) {
      if (i % 4 === 0) {
        operations.push(this.client.set(`perf:concurrent:${i}`, `value_${i}`));
      } else if (i % 4 === 1) {
        operations.push(this.client.get(`perf:concurrent:${i % 20}`));
      } else if (i % 4 === 2) {
        operations.push(this.client.incr(`perf:concurrent:counter:${i % 10}`));
      } else {
        operations.push(this.client.exists(`perf:concurrent:${i % 30}`));
      }
    }
    
    await Promise.all(operations);
    const concurrentEnd = performance.now();
    
    this.results.concurrent = {
      operationCount: concurrentCount,
      totalTime: concurrentEnd - concurrentStart,
      averageTime: (concurrentEnd - concurrentStart) / concurrentCount
    };
    
    console.log(`✅ Concurrent operations completed:`);
    console.log(`   ${concurrentCount} concurrent ops: ${this.results.concurrent.totalTime.toFixed(2)}ms`);
    console.log(`   Average time per op: ${this.results.concurrent.averageTime.toFixed(2)}ms`);
  }

  async testDataStructures() {
    console.log('\\n🏗️  Testing Redis data structures...');
    
    // Hash operations (for user sessions)
    const hashStart = performance.now();
    await this.client.hMSet('perf:user:session:123', {
      userId: '123',
      email: 'user@test.com',
      loginTime: Date.now().toString(),
      lastActivity: Date.now().toString(),
      ipAddress: '192.168.1.1'
    });
    const hashSetEnd = performance.now();
    
    const hashGetStart = performance.now();
    const sessionData = await this.client.hGetAll('perf:user:session:123');
    const hashGetEnd = performance.now();
    
    this.results.dataStructures.hash = {
      set: hashSetEnd - hashStart,
      get: hashGetEnd - hashGetStart
    };
    
    // List operations (for queues)
    const listStart = performance.now();
    for (let i = 0; i < 100; i++) {
      await this.client.lPush('perf:queue', `task_${i}`);
    }
    const listPushEnd = performance.now();
    
    const listPopStart = performance.now();
    for (let i = 0; i < 100; i++) {
      await this.client.rPop('perf:queue');
    }
    const listPopEnd = performance.now();
    
    this.results.dataStructures.list = {
      push100: listPushEnd - listStart,
      pop100: listPopEnd - listPopStart
    };
    
    // Set operations (for unique collections)
    const setAddStart = performance.now();
    for (let i = 0; i < 100; i++) {
      await this.client.sAdd('perf:unique:views', `user_${i}`);
    }
    const setAddEnd = performance.now();
    
    const setMembersStart = performance.now();
    const members = await this.client.sMembers('perf:unique:views');
    const setMembersEnd = performance.now();
    
    this.results.dataStructures.set = {
      add100: setAddEnd - setAddStart,
      getMembers: setMembersEnd - setMembersStart,
      memberCount: members.length
    };
    
    // Sorted Set operations (for leaderboards)
    const zsetAddStart = performance.now();
    for (let i = 0; i < 100; i++) {
      await this.client.zAdd('perf:leaderboard', { score: Math.random() * 1000, value: `user_${i}` });
    }
    const zsetAddEnd = performance.now();
    
    const zsetRangeStart = performance.now();
    const topUsers = await this.client.zRevRange('perf:leaderboard', 0, 9);
    const zsetRangeEnd = performance.now();
    
    this.results.dataStructures.sortedSet = {
      add100: zsetAddEnd - zsetAddStart,
      getTop10: zsetRangeEnd - zsetRangeStart
    };
    
    console.log(`✅ Data structures testing completed:`);
    console.log(`   Hash SET: ${this.results.dataStructures.hash.set.toFixed(2)}ms`);
    console.log(`   Hash GET: ${this.results.dataStructures.hash.get.toFixed(2)}ms`);
    console.log(`   List operations (100 each): ${this.results.dataStructures.list.push100.toFixed(2)}ms / ${this.results.dataStructures.list.pop100.toFixed(2)}ms`);
    console.log(`   Set operations: ${this.results.dataStructures.set.add100.toFixed(2)}ms / ${this.results.dataStructures.set.getMembers.toFixed(2)}ms`);
    console.log(`   Sorted Set operations: ${this.results.dataStructures.sortedSet.add100.toFixed(2)}ms / ${this.results.dataStructures.sortedSet.getTop10.toFixed(2)}ms`);
  }

  async testExpirationPerformance() {
    console.log('\\n⏰ Testing expiration performance...');
    
    // Set keys with expiration
    const expireSetStart = performance.now();
    for (let i = 0; i < 100; i++) {
      await this.client.setEx(`perf:expire:${i}`, 60, `value_${i}`); // 60 seconds TTL
    }
    const expireSetEnd = performance.now();
    
    // Check TTL
    const ttlStart = performance.now();
    const ttlValues = [];
    for (let i = 0; i < 100; i++) {
      ttlValues.push(await this.client.ttl(`perf:expire:${i}`));
    }
    const ttlEnd = performance.now();
    
    this.results.expiration = {
      setWithExpire100: expireSetEnd - expireSetStart,
      checkTTL100: ttlEnd - ttlStart,
      averageTTL: ttlValues.reduce((a, b) => a + b, 0) / ttlValues.length
    };
    
    console.log(`✅ Expiration testing completed:`);
    console.log(`   SET with expiry (100): ${this.results.expiration.setWithExpire100.toFixed(2)}ms`);
    console.log(`   Check TTL (100): ${this.results.expiration.checkTTL100.toFixed(2)}ms`);
    console.log(`   Average TTL: ${this.results.expiration.averageTTL.toFixed(0)} seconds`);
  }

  async testSessionOperations() {
    console.log('\\n👤 Testing session-specific operations...');
    
    // Simulate OTP storage and retrieval (common in auth)
    const otpStart = performance.now();
    const otpOperations = [];
    
    for (let i = 0; i < 50; i++) {
      const phone = `+1555${String(i).padStart(7, '0')}`;
      const otp = Math.floor(Math.random() * 900000) + 100000;
      
      // Store OTP with 5-minute expiration
      otpOperations.push(
        this.client.setEx(`otp:${phone}`, 300, otp.toString())
      );
    }
    
    await Promise.all(otpOperations);
    const otpEnd = performance.now();
    
    // Test OTP verification
    const verifyStart = performance.now();
    const verifyOperations = [];
    
    for (let i = 0; i < 50; i++) {
      const phone = `+1555${String(i).padStart(7, '0')}`;
      verifyOperations.push(this.client.get(`otp:${phone}`));
    }
    
    await Promise.all(verifyOperations);
    const verifyEnd = performance.now();
    
    // Test rate limiting (using counters)
    const rateLimitStart = performance.now();
    const rateLimitOps = [];
    
    for (let i = 0; i < 100; i++) {
      const ip = `192.168.1.${i % 255}`;
      rateLimitOps.push(this.client.incr(`rate_limit:${ip}`));
      rateLimitOps.push(this.client.expire(`rate_limit:${ip}`, 3600)); // 1 hour window
    }
    
    await Promise.all(rateLimitOps);
    const rateLimitEnd = performance.now();
    
    this.results.sessionOperations = {
      otpStorage50: otpEnd - otpStart,
      otpVerification50: verifyEnd - verifyStart,
      rateLimiting100: rateLimitEnd - rateLimitStart
    };
    
    console.log(`✅ Session operations completed:`);
    console.log(`   OTP storage (50): ${this.results.sessionOperations.otpStorage50.toFixed(2)}ms`);
    console.log(`   OTP verification (50): ${this.results.sessionOperations.otpVerification50.toFixed(2)}ms`);
    console.log(`   Rate limiting (100): ${this.results.sessionOperations.rateLimiting100.toFixed(2)}ms`);
  }

  async testMemoryUsage() {
    console.log('\\n💾 Testing memory usage...');
    
    // Get initial memory info
    const initialInfo = await this.client.info('memory');
    const initialMemory = this.parseMemoryInfo(initialInfo);
    
    // Create large dataset
    const largeDataOps = [];
    for (let i = 0; i < 10000; i++) {
      const largeValue = 'x'.repeat(1024); // 1KB per key
      largeDataOps.push(this.client.set(`perf:large:${i}`, largeValue));
    }
    
    await Promise.all(largeDataOps);
    
    // Get memory info after large dataset
    const afterInfo = await this.client.info('memory');
    const afterMemory = this.parseMemoryInfo(afterInfo);
    
    this.results.memory = {
      initialUsed: initialMemory.used_memory,
      afterLargeDataset: afterMemory.used_memory,
      memoryIncrease: afterMemory.used_memory - initialMemory.used_memory,
      keysAdded: 10000
    };
    
    console.log(`✅ Memory usage test completed:`);
    console.log(`   Initial memory: ${(initialMemory.used_memory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   After 10K keys: ${(afterMemory.used_memory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Memory increase: ${(this.results.memory.memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  }

  parseMemoryInfo(infoString) {
    const lines = infoString.split('\\n');
    const memoryInfo = {};
    
    lines.forEach(line => {
      if (line.includes('used_memory:')) {
        memoryInfo.used_memory = parseInt(line.split(':')[1]);
      }
      if (line.includes('used_memory_peak:')) {
        memoryInfo.used_memory_peak = parseInt(line.split(':')[1]);
      }
    });
    
    return memoryInfo;
  }

  async cleanup() {
    console.log('\\n🧹 Cleaning up test data...');
    try {
      // Delete test patterns
      const patterns = [
        'perf:*',
        'otp:*',
        'rate_limit:*'
      ];
      
      for (const pattern of patterns) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
      
      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  generateReport() {
    console.log('\\n📊 =========================');
    console.log('📊 REDIS PERFORMANCE REPORT');
    console.log('📊 =========================');
    
    console.log('\\n🔗 CONNECTION:');
    console.log(`   Connection Time: ${this.results.connection.connectionTime?.toFixed(2)}ms`);
    console.log(`   Ping Time: ${this.results.connection.pingTime?.toFixed(2)}ms`);
    
    console.log('\\n🔄 BASIC OPERATIONS:');
    console.log(`   SET: ${this.results.basicOperations.set?.toFixed(2)}ms`);
    console.log(`   GET: ${this.results.basicOperations.get?.toFixed(2)}ms`);
    console.log(`   EXISTS: ${this.results.basicOperations.exists?.toFixed(2)}ms`);
    console.log(`   DELETE: ${this.results.basicOperations.del?.toFixed(2)}ms`);
    console.log(`   INCREMENT: ${this.results.basicOperations.incr?.toFixed(2)}ms`);
    
    console.log('\\n📦 BULK OPERATIONS:');
    console.log(`   Bulk SET (1000): ${this.results.bulkOperations.bulkSet?.totalTime?.toFixed(2)}ms`);
    console.log(`   Bulk GET (1000): ${this.results.bulkOperations.bulkGet?.totalTime?.toFixed(2)}ms`);
    console.log(`   Bulk DELETE (1000): ${this.results.bulkOperations.bulkDel?.totalTime?.toFixed(2)}ms`);
    
    console.log('\\n🔄 CONCURRENT:');
    console.log(`   100 Concurrent Operations: ${this.results.concurrent.totalTime?.toFixed(2)}ms`);
    
    console.log('\\n🏗️  DATA STRUCTURES:');
    console.log(`   Hash Operations: ${this.results.dataStructures.hash?.set?.toFixed(2)}ms / ${this.results.dataStructures.hash?.get?.toFixed(2)}ms`);
    console.log(`   List Operations (100): ${this.results.dataStructures.list?.push100?.toFixed(2)}ms / ${this.results.dataStructures.list?.pop100?.toFixed(2)}ms`);
    console.log(`   Set Operations (100): ${this.results.dataStructures.set?.add100?.toFixed(2)}ms`);
    
    console.log('\\n👤 SESSION OPERATIONS:');
    console.log(`   OTP Storage (50): ${this.results.sessionOperations?.otpStorage50?.toFixed(2)}ms`);
    console.log(`   OTP Verification (50): ${this.results.sessionOperations?.otpVerification50?.toFixed(2)}ms`);
    console.log(`   Rate Limiting (100): ${this.results.sessionOperations?.rateLimiting100?.toFixed(2)}ms`);
    
    console.log('\\n💾 MEMORY:');
    console.log(`   Memory Increase (10K keys): ${(this.results.memory?.memoryIncrease / 1024 / 1024)?.toFixed(2)} MB`);
    
    // Performance analysis
    console.log('\\n⚠️  PERFORMANCE ANALYSIS:');
    const issues = [];
    
    if (this.results.connection.connectionTime > 100) {
      issues.push('❌ Slow Redis connection (>100ms)');
    }
    if (this.results.basicOperations.get > 1) {
      issues.push('❌ Slow GET operations (>1ms)');
    }
    if (this.results.basicOperations.set > 1) {
      issues.push('❌ Slow SET operations (>1ms)');
    }
    if (this.results.concurrent.averageTime > 5) {
      issues.push('❌ Slow concurrent operations (>5ms average)');
    }
    
    if (issues.length === 0) {
      console.log('✅ All Redis performance metrics within acceptable ranges');
    } else {
      issues.forEach(issue => console.log(issue));
    }
    
    return this.results;
  }

  async runAllTests() {
    try {
      await this.connect();
      await this.testBasicOperations();
      await this.testBulkOperations();
      await this.testConcurrentOperations();
      await this.testDataStructures();
      await this.testExpirationPerformance();
      await this.testSessionOperations();
      await this.testMemoryUsage();
      
      const report = this.generateReport();
      
      await this.cleanup();
      await this.client.quit();
      
      return report;
    } catch (error) {
      console.error('❌ Redis performance test failed:', error);
      if (this.client) {
        await this.cleanup();
        await this.client.quit();
      }
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new RedisPerformanceTester();
  tester.runAllTests()
    .then(results => {
      console.log('\\n✅ Redis performance testing completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Redis performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = RedisPerformanceTester;