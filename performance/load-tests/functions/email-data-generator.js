/**
 * Email Data Generator for Artillery Load Tests
 * Generates realistic email addresses for testing
 */

const domains = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'example.com', 'test.com', 'demo.com', 'tempmail.com', 'mailinator.com'
];

const firstNames = [
  'john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'alex', 'emily',
  'chris', 'anna', 'robert', 'mary', 'james', 'jennifer', 'michael'
];

const lastNames = [
  'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller',
  'davis', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez'
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

function generateRandomEmail() {
  const timestamp = Date.now();
  const randomId = generateRandomString(4);
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const domain = getRandomElement(domains);
  
  // Generate different email formats
  const formats = [
    `${firstName}.${lastName}.${randomId}@${domain}`,
    `${firstName}${lastName}${timestamp}@${domain}`,
    `user${randomId}${timestamp}@${domain}`,
    `test.${randomId}.${firstName}@${domain}`,
    `perf.test.${randomId}@${domain}`
  ];
  
  return getRandomElement(formats);
}

function generateInvalidEmail() {
  const invalidEmails = [
    'invalid.email',
    '@invalid.com',
    'invalid@',
    'invalid..email@test.com',
    'invalid@.com',
    'invalid@com',
    '',
    'notanemail',
    'user@',
    '@domain.com',
    'user@@domain.com',
    'user@domain@com',
    'user name@domain.com'
  ];
  
  return getRandomElement(invalidEmails);
}

module.exports = {
  generateEmailData: function(context, events, done) {
    // 80% valid emails, 20% invalid for error testing
    const useValidEmail = Math.random() < 0.8;
    
    if (useValidEmail) {
      context.vars.resetEmail = generateRandomEmail();
      context.vars.testEmail = generateRandomEmail();
      context.vars.verifyEmail = generateRandomEmail();
    } else {
      context.vars.resetEmail = generateInvalidEmail();
      context.vars.testEmail = generateInvalidEmail();
      context.vars.verifyEmail = generateInvalidEmail();
    }
    
    // Additional email variations
    context.vars.primaryEmail = generateRandomEmail();
    context.vars.secondaryEmail = generateRandomEmail();
    context.vars.otpEmail = generateRandomEmail();
    
    return done();
  },
  
  generateValidEmailData: function(context, events, done) {
    context.vars.resetEmail = generateRandomEmail();
    context.vars.testEmail = generateRandomEmail();
    context.vars.verifyEmail = generateRandomEmail();
    
    return done();
  },
  
  generateInvalidEmailData: function(context, events, done) {
    context.vars.resetEmail = generateInvalidEmail();
    context.vars.testEmail = generateInvalidEmail();
    context.vars.verifyEmail = generateInvalidEmail();
    
    return done();
  },
  
  generateBulkEmailData: function(context, events, done) {
    // Generate multiple email addresses for bulk testing
    context.vars.emails = [];
    for (let i = 0; i < 10; i++) {
      context.vars.emails.push(generateRandomEmail());
    }
    
    context.vars.currentEmail = context.vars.emails[0];
    
    return done();
  }
};