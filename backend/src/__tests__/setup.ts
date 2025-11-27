import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

jest.mock('../lib/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
  }
}));

jest.mock('../lib/otpRedis', () => ({
  getOtp: jest.fn(),
  setOtp: jest.fn(),
  incrementAttempt: jest.fn(),
  incrementResend: jest.fn(),
  getResendCount: jest.fn(),
  OTP_ATTEMPT_LIMIT: 5,
  OTP_RESEND_LIMIT: 3,
}));

jest.mock('../lib/email', () => ({
  sendResetPasswordEmail: jest.fn(),
  sendOtpEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  jest.clearAllMocks();
});