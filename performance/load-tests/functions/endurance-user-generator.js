/**
 * Endurance User Generator for Long-term Load Testing
 * Generates realistic user data for extended testing periods
 */

const realisticFirstNames = [
  'Aaditya', 'Aanand', 'Aarna', 'Aarushi', 'Abhay', 'Abhishek', 'Aditi', 'Aditya',
  'Akash', 'Akshay', 'Ananya', 'Anish', 'Anjali', 'Ankita', 'Anmol', 'Anushka',
  'Arnav', 'Arpit', 'Aruna', 'Aryan', 'Ashish', 'Avani', 'Ayush', 'Bhavana',
  'Deepak', 'Deepika', 'Dev', 'Devi', 'Dhruv', 'Divya', 'Gaurav', 'Harsh',
  'Ishaan', 'Ishita', 'Jatin', 'Kavya', 'Kiara', 'Krishna', 'Manish', 'Meera',
  'Nidhi', 'Niharika', 'Nikhil', 'Nisha', 'Pallavi', 'Pooja', 'Pradeep', 'Pranav',
  'Prashant', 'Priya', 'Rahul', 'Raj', 'Rakesh', 'Ravi', 'Rohit', 'Sagar',
  'Sakshi', 'Sameer', 'Sandeep', 'Sanjay', 'Shreya', 'Shubham', 'Sneha', 'Sonia',
  'Suresh', 'Swati', 'Tanvi', 'Tushar', 'Vaibhav', 'Varun', 'Vidya', 'Vikash',
  'Vinay', 'Vishal', 'Yash', 'Yogesh'
];

const realisticLastNames = [
  'Agarwal', 'Aggarwal', 'Bansal', 'Chauhan', 'Chaudhary', 'Choudhary', 'Das',
  'Desai', 'Dutta', 'Gandhi', 'Goel', 'Goyal', 'Gupta', 'Jain', 'Jha', 'Joshi',
  'Kapoor', 'Kaur', 'Khan', 'Kumar', 'Malhotra', 'Mehta', 'Mishra', 'Modi',
  'Nair', 'Pandey', 'Patel', 'Prasad', 'Rao', 'Reddy', 'Roy', 'Sahu', 'Saxena',
  'Shah', 'Sharma', 'Shukla', 'Singh', 'Sinha', 'Tiwari', 'Tripathi', 'Varma',
  'Verma', 'Yadav'
];

const cities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune',
  'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana'
];

const religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain'];
const castes = ['General', 'OBC', 'SC', 'ST'];
const genders = ['Male', 'Female'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRealisticString(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRealisticPhoneNumber() {
  // Generate Indian phone numbers for more realistic testing
  const codes = ['98', '97', '96', '95', '94', '93', '92', '91', '90', '89'];
  const code = getRandomElement(codes);
  const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `+91${code}${number}`;
}

function generateRealisticDateOfBirth() {
  // Age range 22-35 for matrimonial site
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(Math.random() * 14) - 22; // 22-35 years old
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  
  return `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function generateEnduranceSessionId() {
  const timestamp = Date.now();
  const randomId = generateRealisticString(8);
  return `endurance_${timestamp}_${randomId}`;
}

module.exports = {
  generateEnduranceUserData: function(context, events, done) {
    const sessionId = generateEnduranceSessionId();
    const uniqueId = generateRealisticString(6);
    const timestamp = Date.now();
    
    const firstName = getRandomElement(realisticFirstNames);
    const lastName = getRandomElement(realisticLastNames);
    
    context.vars.firstName = firstName;
    context.vars.lastName = lastName;
    context.vars.enduranceEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${uniqueId}@endurance.test.com`;
    context.vars.password = `Endurance123!${uniqueId}`;
    context.vars.phone = generateRealisticPhoneNumber();
    context.vars.dateOfBirth = generateRealisticDateOfBirth();
    context.vars.gender = getRandomElement(genders);
    context.vars.religion = getRandomElement(religions);
    context.vars.caste = getRandomElement(castes);
    
    // Additional realistic profile data
    context.vars.city = getRandomElement(cities);
    context.vars.sessionId = sessionId;
    context.vars.userType = 'endurance_test';
    context.vars.registrationTimestamp = timestamp;
    
    // Endurance-specific tracking
    context.vars.testDuration = 'long_term';
    context.vars.loadType = 'endurance';
    context.vars.expectedBehavior = 'realistic_user_journey';
    
    return done();
  },
  
  generateRealisticUserBehavior: function(context, events, done) {
    // Simulate realistic user behavior patterns
    context.vars.thinkTime = Math.floor(Math.random() * 30) + 10; // 10-40 seconds
    context.vars.sessionLength = Math.floor(Math.random() * 1800) + 300; // 5-35 minutes
    context.vars.actionCount = Math.floor(Math.random() * 20) + 5; // 5-25 actions
    context.vars.isActiveUser = Math.random() < 0.7; // 70% active users
    
    return done();
  }
};