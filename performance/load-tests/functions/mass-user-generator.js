/**
 * Mass User Generator for Stress Testing
 * Generates large volumes of user data for extreme load scenarios
 */

const firstNamePrefixes = ['Test', 'Stress', 'Load', 'Perf', 'Mass', 'Bulk', 'Heavy', 'Ultra'];
const lastNameSuffixes = ['User', 'Account', 'Profile', 'Entity', 'Record', 'Data', 'Instance'];

const religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const castes = ['General', 'OBC', 'SC', 'ST', 'Other'];
const genders = ['Male', 'Female', 'Other'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateMassiveString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateMassivePhoneNumber() {
  // Generate phone numbers with different formats to test validation
  const formats = [
    () => `+1555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
    () => `+91${Math.floor(Math.random() * 1000000000).toString().padStart(10, '0')}`,
    () => `+44${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    () => `+61${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`
  ];
  
  return getRandomElement(formats)();
}

function generateDateOfBirth() {
  const year = Math.floor(Math.random() * 25) + 1975; // 1975-1999
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function generateLargeBio() {
  const sentences = [
    "This is a comprehensive performance test user account designed to stress test the system.",
    "The account contains extensive biographical information to test data handling capabilities.",
    "Multiple sentences are included to test text processing and storage efficiency.",
    "This bio is intentionally long to test system performance with larger text fields.",
    "Additional content is included to simulate realistic user-generated content scenarios.",
    "The system should handle this extended biographical information without performance degradation."
  ];
  
  return sentences.join(' ') + ' Generated at: ' + new Date().toISOString();
}

module.exports = {
  generateMassUserData: function(context, events, done) {
    const uniqueId = generateMassiveString(12);
    const timestamp = Date.now();
    const threadId = Math.floor(Math.random() * 1000);
    
    context.vars.firstName = `${getRandomElement(firstNamePrefixes)}${uniqueId.substring(0, 6)}`;
    context.vars.lastName = `${getRandomElement(lastNameSuffixes)}${uniqueId.substring(6, 12)}`;
    context.vars.email = `stress.test.${uniqueId}.${timestamp}.${threadId}@massload.com`;
    context.vars.password = `StressTest123!${uniqueId}`;
    context.vars.phone = generateMassivePhoneNumber();
    context.vars.dateOfBirth = generateDateOfBirth();
    context.vars.gender = getRandomElement(genders);
    context.vars.religion = getRandomElement(religions);
    context.vars.caste = getRandomElement(castes);
    
    // Additional fields for stress testing
    context.vars.bio = generateLargeBio();
    context.vars.occupation = `Stress Tester ${uniqueId}`;
    context.vars.education = `Performance Testing University ${timestamp}`;
    context.vars.location = `Load Test City ${threadId}`;
    context.vars.interests = `Testing, Performance, Stress Analysis, System Optimization ${uniqueId}`;
    
    // Batch data for bulk operations
    context.vars.batchSize = Math.floor(Math.random() * 50) + 10; // 10-59 records
    context.vars.batchId = `batch_${uniqueId}_${timestamp}`;
    
    return done();
  },
  
  generateMassiveUserBatch: function(context, events, done) {
    // Generate multiple users for batch testing
    context.vars.userBatch = [];
    const batchSize = 25;
    
    for (let i = 0; i < batchSize; i++) {
      const uniqueId = generateMassiveString(8);
      const user = {
        firstName: `Batch${i}${uniqueId}`,
        lastName: `User${i}${uniqueId}`,
        email: `batch.${i}.${uniqueId}.${Date.now()}@masstest.com`,
        password: `BatchTest123!${uniqueId}`,
        phone: generateMassivePhoneNumber(),
        dateOfBirth: generateDateOfBirth(),
        gender: getRandomElement(genders),
        religion: getRandomElement(religions),
        caste: getRandomElement(castes)
      };
      context.vars.userBatch.push(user);
    }
    
    context.vars.currentBatchUser = context.vars.userBatch[0];
    context.vars.batchIndex = 0;
    
    return done();
  }
};