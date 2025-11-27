/**
 * Phone Data Generator for Artillery Load Tests
 * Generates realistic phone numbers for SMS/OTP testing
 */

// Valid US phone number area codes for testing
const areaCodes = [
  '555', '212', '213', '323', '424', '310', '415', '510', '408', '650',
  '702', '725', '305', '786', '954', '561', '407', '321', '727', '813',
  '404', '678', '770', '470', '912', '229', '478', '202', '301', '240'
];

// Test phone numbers for development (these won't actually send SMS)
const testPhoneNumbers = [
  '+15551234567', '+15551234568', '+15551234569', '+15551234570',
  '+15551234571', '+15551234572', '+15551234573', '+15551234574'
];

// International phone numbers for testing
const internationalNumbers = [
  '+91987654321', '+919876543210', '+447911123456', '+61491570156',
  '+33612345678', '+49151234567890', '+81901234567', '+8613912345678'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomUSPhoneNumber() {
  const areaCode = getRandomElement(areaCodes);
  const centralOfficeCode = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${centralOfficeCode}${lineNumber}`;
}

function generateRandomOTP() {
  return Math.floor(Math.random() * 900000) + 100000;
}

function generateRandomInternationalNumber() {
  return getRandomElement(internationalNumbers);
}

module.exports = {
  generatePhoneData: function(context, events, done) {
    // 60% test numbers, 30% random US numbers, 10% international
    const rand = Math.random();
    
    if (rand < 0.6) {
      context.vars.testPhone = getRandomElement(testPhoneNumbers);
    } else if (rand < 0.9) {
      context.vars.testPhone = generateRandomUSPhoneNumber();
    } else {
      context.vars.testPhone = generateRandomInternationalNumber();
    }
    
    // Generate various OTP scenarios
    context.vars.validOTP = generateRandomOTP().toString();
    context.vars.invalidOTP = '000000';
    context.vars.expiredOTP = '123456';
    
    // Additional phone variants for testing
    context.vars.secondaryPhone = generateRandomUSPhoneNumber();
    context.vars.invalidPhone = '+1invalid';
    context.vars.emptyPhone = '';
    context.vars.tooLongPhone = '+1' + '5'.repeat(20);
    
    return done();
  },
  
  generateUSPhoneData: function(context, events, done) {
    context.vars.testPhone = generateRandomUSPhoneNumber();
    context.vars.validOTP = generateRandomOTP().toString();
    return done();
  },
  
  generateTestPhoneData: function(context, events, done) {
    context.vars.testPhone = getRandomElement(testPhoneNumbers);
    context.vars.validOTP = generateRandomOTP().toString();
    return done();
  },
  
  generateInvalidPhoneData: function(context, events, done) {
    const invalidPhones = [
      '+1invalid', '123', '', 'notaphone', '+1' + '5'.repeat(20),
      '555-555-5555', '(555) 555-5555', '5555555555'
    ];
    
    context.vars.testPhone = getRandomElement(invalidPhones);
    context.vars.validOTP = generateRandomOTP().toString();
    
    return done();
  }
};