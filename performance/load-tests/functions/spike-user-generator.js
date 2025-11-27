/**
 * Spike User Generator for Spike Load Testing
 * Generates user data specifically for sudden traffic spikes
 */

function generateSpikeString(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateSpikePhoneNumber() {
  // Use specific area code for spike testing identification
  const spikeAreaCode = '999';
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+1${spikeAreaCode}${number}`;
}

module.exports = {
  generateSpikeUserData: function(context, events, done) {
    const spikeId = generateSpikeString(8);
    const timestamp = Date.now();
    const microsecond = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    
    context.vars.firstName = `Spike${spikeId}`;
    context.vars.lastName = `Test${timestamp.toString().slice(-6)}`;
    context.vars.email = `spike.${spikeId}.${microsecond}@spiketest.com`;
    context.vars.password = `SpikeTest123!${spikeId}`;
    context.vars.phone = generateSpikePhoneNumber();
    context.vars.dateOfBirth = '1995-01-01';
    context.vars.gender = 'Male';
    context.vars.religion = 'Hindu';
    context.vars.caste = 'General';
    
    // Spike-specific identifiers
    context.vars.spikeId = spikeId;
    context.vars.spikeTimestamp = timestamp;
    context.vars.spikeMicrosecond = microsecond;
    
    return done();
  }
};