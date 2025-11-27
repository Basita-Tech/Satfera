/**
 * Login Data Generator for Artillery Load Tests
 * Generates realistic login credentials and test scenarios
 */

// Sample test users that should exist in the system
const testUsers = [
  { email: 'test1@satfera.com', password: 'TestPass123!' },
  { email: 'test2@satfera.com', password: 'TestPass123!' },
  { email: 'test3@satfera.com', password: 'TestPass123!' },
  { email: 'user1@example.com', password: 'UserPass123!' },
  { email: 'user2@example.com', password: 'UserPass123!' },
  { email: 'demo@satfera.com', password: 'DemoPass123!' }
];

// Invalid credentials for testing error scenarios
const invalidCredentials = [
  { email: 'nonexistent@fake.com', password: 'WrongPass123!' },
  { email: 'invalid@test.com', password: 'InvalidPass!' },
  { email: 'fake.user@example.com', password: 'FakePass123!' }
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomString(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  generateLoginData: function(context, events, done) {
    // 70% chance of using valid credentials, 30% invalid for realistic testing
    const useValidCredentials = Math.random() < 0.7;
    
    if (useValidCredentials) {
      const user = getRandomElement(testUsers);
      context.vars.loginEmail = user.email;
      context.vars.loginPassword = user.password;
    } else {
      const invalidUser = getRandomElement(invalidCredentials);
      context.vars.loginEmail = invalidUser.email;
      context.vars.loginPassword = invalidUser.password;
    }
    
    // Add some realistic variation
    const randomId = generateRandomString();
    context.vars.sessionId = `session_${randomId}_${Date.now()}`;
    context.vars.userAgent = `LoadTest/${randomId}`;
    
    return done();
  },
  
  generateValidLoginData: function(context, events, done) {
    const user = getRandomElement(testUsers);
    context.vars.loginEmail = user.email;
    context.vars.loginPassword = user.password;
    
    return done();
  },
  
  generateInvalidLoginData: function(context, events, done) {
    const invalidUser = getRandomElement(invalidCredentials);
    context.vars.loginEmail = invalidUser.email;
    context.vars.loginPassword = invalidUser.password;
    
    return done();
  }
};