/**
 * User Data Generator for Artillery Load Tests
 * Generates realistic user registration data
 */

const firstNames = [
  'Aarav', 'Arjun', 'Advik', 'Aditya', 'Ananya', 'Aarushi', 'Avni', 'Anushka',
  'Dhruv', 'Diya', 'Dev', 'Devansh', 'Kavya', 'Kiara', 'Krishna', 'Krish',
  'Mohammed', 'Malik', 'Mira', 'Maya', 'Priya', 'Parth', 'Pranav', 'Pooja',
  'Raj', 'Rahul', 'Riya', 'Rohan', 'Sanya', 'Shruti', 'Siddharth', 'Shreya',
  'Varun', 'Vidya', 'Virat', 'Vanya', 'Yash', 'Yasmin', 'Zara', 'Zayan'
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Agarwal', 'Bansal', 'Mittal', 'Jain', 'Goyal',
  'Singh', 'Kumar', 'Yadav', 'Chauhan', 'Rajput', 'Thakur', 'Chaudhary',
  'Patel', 'Shah', 'Mehta', 'Dave', 'Desai', 'Joshi', 'Trivedi', 'Pandey',
  'Reddy', 'Rao', 'Krishna', 'Prasad', 'Naidu', 'Goud', 'Chowdary',
  'Iyer', 'Nair', 'Pillai', 'Menon', 'Kumar', 'Raman', 'Krishnan'
];

const religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const castes = ['General', 'OBC', 'SC', 'ST', 'Other'];
const genders = ['Male', 'Female', 'Other'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDateOfBirth() {
  const startDate = new Date(1980, 0, 1);
  const endDate = new Date(2000, 11, 31);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
}

function getRandomPhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000000) + 1000000;
  return `+1${areaCode}${number}`;
}

function generateRandomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  generateUserData: function(context, events, done) {
    const uniqueId = generateRandomString(6);
    const timestamp = Date.now();
    
    context.vars.firstName = getRandomElement(firstNames);
    context.vars.lastName = getRandomElement(lastNames);
    context.vars.email = `perf.test.${uniqueId}.${timestamp}@satfera.com`;
    context.vars.password = `TestPass123!${uniqueId}`;
    context.vars.phone = getRandomPhoneNumber();
    context.vars.dateOfBirth = getRandomDateOfBirth();
    context.vars.gender = getRandomElement(genders);
    context.vars.religion = getRandomElement(religions);
    context.vars.caste = getRandomElement(castes);
    
    return done();
  }
};