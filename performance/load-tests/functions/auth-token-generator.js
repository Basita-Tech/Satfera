/**
 * Auth Token Generator for Artillery Load Tests
 * Generates various authentication tokens for testing
 */

function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateJWTLikeToken() {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    sub: "test_user_" + generateRandomString(8),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    userId: generateRandomString(12)
  }));
  const signature = generateRandomString(43);
  
  return `${header}.${payload}.${signature}`;
}

function generateExpiredToken() {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    sub: "expired_user",
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    userId: generateRandomString(12)
  }));
  const signature = generateRandomString(43);
  
  return `${header}.${payload}.${signature}`;
}

function generateMalformedToken() {
  const malformedTokens = [
    'invalid.token.here',
    'Bearer invalid_token',
    generateRandomString(64),
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid_payload',
    'malformed..token',
    '',
    'null',
    'undefined'
  ];
  
  return malformedTokens[Math.floor(Math.random() * malformedTokens.length)];
}

module.exports = {
  generateAuthToken: function(context, events, done) {
    // 60% fake valid tokens, 20% expired, 20% malformed
    const tokenType = Math.random();
    
    if (tokenType < 0.6) {
      context.vars.fakeToken = generateJWTLikeToken();
      context.vars.authToken = context.vars.fakeToken;
    } else if (tokenType < 0.8) {
      context.vars.fakeToken = generateExpiredToken();
      context.vars.authToken = context.vars.fakeToken;
    } else {
      context.vars.fakeToken = generateMalformedToken();
      context.vars.authToken = context.vars.fakeToken;
    }
    
    // Additional token variations
    context.vars.validToken = generateJWTLikeToken();
    context.vars.expiredToken = generateExpiredToken();
    context.vars.malformedToken = generateMalformedToken();
    context.vars.bearerToken = `Bearer ${context.vars.validToken}`;
    
    return done();
  },
  
  generateValidToken: function(context, events, done) {
    context.vars.fakeToken = generateJWTLikeToken();
    context.vars.authToken = context.vars.fakeToken;
    return done();
  },
  
  generateExpiredToken: function(context, events, done) {
    context.vars.fakeToken = generateExpiredToken();
    context.vars.authToken = context.vars.fakeToken;
    return done();
  },
  
  generateMalformedToken: function(context, events, done) {
    context.vars.fakeToken = generateMalformedToken();
    context.vars.authToken = context.vars.fakeToken;
    return done();
  }
};