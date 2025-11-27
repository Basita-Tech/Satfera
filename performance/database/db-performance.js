/**
 * Database Performance Testing Suite
 * Comprehensive MongoDB performance and stress testing
 */

const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
require('dotenv').config();

// Import models (adjust paths as needed)
// const User = require('../../backend/src/models/User');
// const Profile = require('../../backend/src/models/Profile');

// Mock schemas for testing if models aren't available
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, index: true },
  password: String,
  phone: { type: String, index: true },
  dateOfBirth: Date,
  gender: String,
  religion: String,
  caste: String,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
});

const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  bio: String,
  occupation: String,
  education: String,
  location: String,
  interests: [String],
  preferences: {
    ageRange: { min: Number, max: Number },
    location: String,
    religion: String,
    caste: String
  },
  photos: [String],
  profileViews: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now }
});

const TestUser = mongoose.model('TestUser', UserSchema);
const TestProfile = mongoose.model('TestProfile', ProfileSchema);

class DatabasePerformanceTester {
  constructor() {
    this.results = {
      connection: {},
      queries: {},
      inserts: {},
      updates: {},
      deletes: {},
      aggregations: {},
      indexes: {},
      concurrent: {}
    };
    this.testData = [];
  }

  async connect() {
    try {
      const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/satfera_perf_test';
      console.log('Connecting to MongoDB for performance testing...');
      
      const startTime = performance.now();
      await mongoose.connect(connectionString, {
        maxPoolSize: 100,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0
      });
      const endTime = performance.now();
      
      this.results.connection.connectionTime = endTime - startTime;
      console.log(`✅ Connected to MongoDB in ${this.results.connection.connectionTime.toFixed(2)}ms`);
      
      // Test connection pool
      await this.testConnectionPool();
      
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async testConnectionPool() {
    console.log('\\n🔄 Testing connection pool performance...');
    const poolTests = [];
    const startTime = performance.now();
    
    // Simulate 50 concurrent connections
    for (let i = 0; i < 50; i++) {
      poolTests.push(this.performSimpleQuery());
    }
    
    await Promise.all(poolTests);
    const endTime = performance.now();
    
    this.results.connection.poolTest = {
      concurrentConnections: 50,
      totalTime: endTime - startTime,
      averageTime: (endTime - startTime) / 50
    };
    
    console.log(`✅ Connection pool test completed in ${(endTime - startTime).toFixed(2)}ms`);
  }

  async performSimpleQuery() {
    return await TestUser.findOne().lean();
  }

  generateTestUser(index) {
    return {
      firstName: `PerfTest${index}`,
      lastName: `User${index}`,
      email: `perftest${index}_${Date.now()}@test.com`,
      password: `hashedpassword${index}`,
      phone: `+1555${String(index).padStart(7, '0')}`,
      dateOfBirth: new Date(1990 + (index % 15), (index % 12), (index % 28) + 1),
      gender: index % 2 === 0 ? 'Male' : 'Female',
      religion: ['Hindu', 'Muslim', 'Christian', 'Sikh'][index % 4],
      caste: ['General', 'OBC', 'SC', 'ST'][index % 4],
      isVerified: index % 3 === 0
    };
  }

  generateTestProfile(userId, index) {
    return {
      userId: userId,
      bio: `This is a performance test bio for user ${index}. `.repeat(5),
      occupation: `Occupation ${index}`,
      education: `University ${index}`,
      location: `City ${index}`,
      interests: [`Interest${index}`, `Hobby${index}`, `Activity${index}`],
      preferences: {
        ageRange: { min: 22 + (index % 5), max: 35 + (index % 10) },
        location: `PreferredCity${index}`,
        religion: ['Hindu', 'Muslim', 'Christian', 'Sikh'][index % 4],
        caste: ['General', 'OBC', 'SC', 'ST'][index % 4]
      },
      photos: [`photo${index}_1.jpg`, `photo${index}_2.jpg`],
      profileViews: Math.floor(Math.random() * 1000)
    };
  }

  async testInsertPerformance() {
    console.log('\\n📝 Testing insert performance...');
    
    // Single insert test
    const singleInsertStart = performance.now();
    const singleUser = await TestUser.create(this.generateTestUser(999999));
    const singleInsertEnd = performance.now();
    
    this.results.inserts.singleInsert = singleInsertEnd - singleInsertStart;
    
    // Bulk insert test
    const bulkData = [];
    for (let i = 0; i < 1000; i++) {
      bulkData.push(this.generateTestUser(i));
    }
    
    const bulkInsertStart = performance.now();
    const insertedUsers = await TestUser.insertMany(bulkData, { ordered: false });
    const bulkInsertEnd = performance.now();
    
    this.results.inserts.bulkInsert = {
      count: 1000,
      totalTime: bulkInsertEnd - bulkInsertStart,
      averagePerDocument: (bulkInsertEnd - bulkInsertStart) / 1000
    };
    
    // Store some user IDs for later tests
    this.testData.userIds = insertedUsers.slice(0, 100).map(user => user._id);
    
    console.log(`✅ Insert performance test completed:`);
    console.log(`   Single insert: ${this.results.inserts.singleInsert.toFixed(2)}ms`);
    console.log(`   Bulk insert (1000): ${this.results.inserts.bulkInsert.totalTime.toFixed(2)}ms`);
    console.log(`   Average per document: ${this.results.inserts.bulkInsert.averagePerDocument.toFixed(2)}ms`);
  }

  async testQueryPerformance() {
    console.log('\\n🔍 Testing query performance...');
    
    // Simple find by ID
    const findByIdStart = performance.now();
    await TestUser.findById(this.testData.userIds[0]);
    const findByIdEnd = performance.now();
    this.results.queries.findById = findByIdEnd - findByIdStart;
    
    // Find by email (indexed)
    const findByEmailStart = performance.now();
    await TestUser.findOne({ email: 'perftest0_' });
    const findByEmailEnd = performance.now();
    this.results.queries.findByEmail = findByEmailEnd - findByEmailStart;
    
    // Find by non-indexed field
    const findByNameStart = performance.now();
    await TestUser.findOne({ firstName: 'PerfTest0' });
    const findByNameEnd = performance.now();
    this.results.queries.findByName = findByNameEnd - findByNameStart;
    
    // Complex query with multiple conditions
    const complexQueryStart = performance.now();
    await TestUser.find({
      gender: 'Male',
      religion: 'Hindu',
      isVerified: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).limit(50);
    const complexQueryEnd = performance.now();
    this.results.queries.complexQuery = complexQueryEnd - complexQueryStart;
    
    // Pagination test
    const paginationStart = performance.now();
    await TestUser.find({}).skip(100).limit(20).sort({ createdAt: -1 });
    const paginationEnd = performance.now();
    this.results.queries.pagination = paginationEnd - paginationStart;
    
    console.log(`✅ Query performance test completed:`);
    console.log(`   Find by ID: ${this.results.queries.findById.toFixed(2)}ms`);
    console.log(`   Find by email: ${this.results.queries.findByEmail.toFixed(2)}ms`);
    console.log(`   Find by name: ${this.results.queries.findByName.toFixed(2)}ms`);
    console.log(`   Complex query: ${this.results.queries.complexQuery.toFixed(2)}ms`);
    console.log(`   Pagination: ${this.results.queries.pagination.toFixed(2)}ms`);
  }

  async testUpdatePerformance() {
    console.log('\\n✏️  Testing update performance...');
    
    // Single update
    const singleUpdateStart = performance.now();
    await TestUser.updateOne(
      { _id: this.testData.userIds[0] },
      { $set: { firstName: 'UpdatedPerfTest', lastActive: new Date() } }
    );
    const singleUpdateEnd = performance.now();
    this.results.updates.singleUpdate = singleUpdateEnd - singleUpdateStart;
    
    // Bulk update
    const bulkUpdateStart = performance.now();
    await TestUser.updateMany(
      { gender: 'Male' },
      { $set: { lastActive: new Date() }, $inc: { profileViews: 1 } }
    );
    const bulkUpdateEnd = performance.now();
    this.results.updates.bulkUpdate = bulkUpdateEnd - bulkUpdateStart;
    
    console.log(`✅ Update performance test completed:`);
    console.log(`   Single update: ${this.results.updates.singleUpdate.toFixed(2)}ms`);
    console.log(`   Bulk update: ${this.results.updates.bulkUpdate.toFixed(2)}ms`);
  }

  async testAggregationPerformance() {
    console.log('\\n📊 Testing aggregation performance...');
    
    // User statistics aggregation
    const statsAggregationStart = performance.now();
    const userStats = await TestUser.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
          avgAge: { 
            $avg: { 
              $divide: [
                { $subtract: [new Date(), '$dateOfBirth'] }, 
                365.25 * 24 * 60 * 60 * 1000
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    const statsAggregationEnd = performance.now();
    this.results.aggregations.userStats = statsAggregationEnd - statsAggregationStart;
    
    // Complex aggregation with lookup
    const complexAggregationStart = performance.now();
    await TestUser.aggregate([
      { $match: { isVerified: true } },
      {
        $group: {
          _id: { religion: '$religion', caste: '$caste' },
          count: { $sum: 1 },
          users: { $push: { firstName: '$firstName', lastName: '$lastName' } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const complexAggregationEnd = performance.now();
    this.results.aggregations.complexAggregation = complexAggregationEnd - complexAggregationStart;
    
    console.log(`✅ Aggregation performance test completed:`);
    console.log(`   User stats: ${this.results.aggregations.userStats.toFixed(2)}ms`);
    console.log(`   Complex aggregation: ${this.results.aggregations.complexAggregation.toFixed(2)}ms`);
  }

  async testIndexPerformance() {
    console.log('\\n🗂️  Testing index performance...');
    
    // Test query performance before custom index
    const beforeIndexStart = performance.now();
    await TestUser.find({ religion: 'Hindu', caste: 'General' });
    const beforeIndexEnd = performance.now();
    const beforeIndexTime = beforeIndexEnd - beforeIndexStart;
    
    // Create compound index
    const indexCreationStart = performance.now();
    await TestUser.createIndex({ religion: 1, caste: 1 });
    const indexCreationEnd = performance.now();
    
    // Test query performance after index
    const afterIndexStart = performance.now();
    await TestUser.find({ religion: 'Hindu', caste: 'General' });
    const afterIndexEnd = performance.now();
    const afterIndexTime = afterIndexEnd - afterIndexStart;
    
    this.results.indexes = {
      indexCreationTime: indexCreationEnd - indexCreationStart,
      queryBeforeIndex: beforeIndexTime,
      queryAfterIndex: afterIndexTime,
      performanceImprovement: ((beforeIndexTime - afterIndexTime) / beforeIndexTime) * 100
    };
    
    console.log(`✅ Index performance test completed:`);
    console.log(`   Index creation: ${this.results.indexes.indexCreationTime.toFixed(2)}ms`);
    console.log(`   Query before index: ${this.results.indexes.queryBeforeIndex.toFixed(2)}ms`);
    console.log(`   Query after index: ${this.results.indexes.queryAfterIndex.toFixed(2)}ms`);
    console.log(`   Performance improvement: ${this.results.indexes.performanceImprovement.toFixed(2)}%`);
  }

  async testConcurrentOperations() {
    console.log('\\n🔄 Testing concurrent operations...');
    
    const concurrentOperations = [];
    const operationCount = 50;
    
    const concurrentStart = performance.now();
    
    // Mix of different operations
    for (let i = 0; i < operationCount; i++) {
      if (i % 4 === 0) {
        // Insert operation
        concurrentOperations.push(
          TestUser.create(this.generateTestUser(100000 + i))
        );
      } else if (i % 4 === 1) {
        // Query operation
        concurrentOperations.push(
          TestUser.findOne({ gender: 'Male' })
        );
      } else if (i % 4 === 2) {
        // Update operation
        concurrentOperations.push(
          TestUser.updateOne(
            { _id: this.testData.userIds[i % this.testData.userIds.length] },
            { $inc: { profileViews: 1 } }
          )
        );
      } else {
        // Aggregation operation
        concurrentOperations.push(
          TestUser.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }])
        );
      }
    }
    
    await Promise.all(concurrentOperations);
    const concurrentEnd = performance.now();
    
    this.results.concurrent = {
      operationCount: operationCount,
      totalTime: concurrentEnd - concurrentStart,
      averageTime: (concurrentEnd - concurrentStart) / operationCount
    };
    
    console.log(`✅ Concurrent operations test completed:`);
    console.log(`   ${operationCount} concurrent operations: ${this.results.concurrent.totalTime.toFixed(2)}ms`);
    console.log(`   Average time per operation: ${this.results.concurrent.averageTime.toFixed(2)}ms`);
  }

  async testMemoryUsage() {
    console.log('\\n💾 Testing memory usage...');
    
    const initialMemory = process.memoryUsage();
    
    // Create a large dataset
    const largeDataset = [];
    for (let i = 0; i < 10000; i++) {
      largeDataset.push(this.generateTestUser(200000 + i));
    }
    
    const beforeInsertMemory = process.memoryUsage();
    
    // Insert large dataset
    await TestUser.insertMany(largeDataset, { ordered: false });
    
    // Query large dataset
    const users = await TestUser.find({}).limit(5000).lean();
    
    const afterQueryMemory = process.memoryUsage();
    
    this.results.memory = {
      initialHeapUsed: initialMemory.heapUsed,
      beforeInsertHeapUsed: beforeInsertMemory.heapUsed,
      afterQueryHeapUsed: afterQueryMemory.heapUsed,
      memoryIncrease: afterQueryMemory.heapUsed - initialMemory.heapUsed,
      documentsRetrieved: users.length
    };
    
    console.log(`✅ Memory usage test completed:`);
    console.log(`   Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Final heap: ${(afterQueryMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Memory increase: ${(this.results.memory.memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  }

  async cleanup() {
    console.log('\\n🧹 Cleaning up test data...');
    try {
      await TestUser.deleteMany({});
      await TestProfile.deleteMany({});
      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  generateReport() {
    console.log('\\n📊 =========================');
    console.log('📊 DATABASE PERFORMANCE REPORT');
    console.log('📊 =========================');
    
    console.log('\\n🔗 CONNECTION:');
    console.log(`   Connection Time: ${this.results.connection.connectionTime?.toFixed(2)}ms`);
    console.log(`   Pool Test (50 concurrent): ${this.results.connection.poolTest?.totalTime?.toFixed(2)}ms`);
    
    console.log('\\n📝 INSERTS:');
    console.log(`   Single Insert: ${this.results.inserts.singleInsert?.toFixed(2)}ms`);
    console.log(`   Bulk Insert (1000): ${this.results.inserts.bulkInsert?.totalTime?.toFixed(2)}ms`);
    
    console.log('\\n🔍 QUERIES:');
    console.log(`   Find by ID: ${this.results.queries.findById?.toFixed(2)}ms`);
    console.log(`   Find by Email: ${this.results.queries.findByEmail?.toFixed(2)}ms`);
    console.log(`   Complex Query: ${this.results.queries.complexQuery?.toFixed(2)}ms`);
    
    console.log('\\n✏️  UPDATES:');
    console.log(`   Single Update: ${this.results.updates.singleUpdate?.toFixed(2)}ms`);
    console.log(`   Bulk Update: ${this.results.updates.bulkUpdate?.toFixed(2)}ms`);
    
    console.log('\\n📊 AGGREGATIONS:');
    console.log(`   User Stats: ${this.results.aggregations.userStats?.toFixed(2)}ms`);
    console.log(`   Complex Aggregation: ${this.results.aggregations.complexAggregation?.toFixed(2)}ms`);
    
    console.log('\\n🗂️  INDEXES:');
    console.log(`   Index Creation: ${this.results.indexes.indexCreationTime?.toFixed(2)}ms`);
    console.log(`   Performance Improvement: ${this.results.indexes.performanceImprovement?.toFixed(2)}%`);
    
    console.log('\\n🔄 CONCURRENT:');
    console.log(`   50 Concurrent Operations: ${this.results.concurrent.totalTime?.toFixed(2)}ms`);
    
    console.log('\\n💾 MEMORY:');
    console.log(`   Memory Increase: ${(this.results.memory?.memoryIncrease / 1024 / 1024)?.toFixed(2)} MB`);
    
    // Performance thresholds and recommendations
    console.log('\\n⚠️  PERFORMANCE ANALYSIS:');
    const issues = [];
    
    if (this.results.connection.connectionTime > 1000) {
      issues.push('❌ Slow database connection (>1s)');
    }
    if (this.results.queries.findById > 10) {
      issues.push('❌ Slow ID queries (>10ms)');
    }
    if (this.results.queries.complexQuery > 1000) {
      issues.push('❌ Slow complex queries (>1s) - Consider indexing');
    }
    if (this.results.inserts.bulkInsert?.averagePerDocument > 10) {
      issues.push('❌ Slow bulk inserts (>10ms per doc)');
    }
    
    if (issues.length === 0) {
      console.log('✅ All performance metrics within acceptable ranges');
    } else {
      issues.forEach(issue => console.log(issue));
    }
    
    return this.results;
  }

  async runAllTests() {
    try {
      await this.connect();
      await this.testInsertPerformance();
      await this.testQueryPerformance();
      await this.testUpdatePerformance();
      await this.testAggregationPerformance();
      await this.testIndexPerformance();
      await this.testConcurrentOperations();
      await this.testMemoryUsage();
      
      const report = this.generateReport();
      
      await this.cleanup();
      await mongoose.disconnect();
      
      return report;
    } catch (error) {
      console.error('❌ Database performance test failed:', error);
      await this.cleanup();
      await mongoose.disconnect();
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DatabasePerformanceTester();
  tester.runAllTests()
    .then(results => {
      console.log('\\n✅ Database performance testing completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Database performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = DatabasePerformanceTester;