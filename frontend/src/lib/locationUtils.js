import { Country, State, City } from 'country-state-city';

// Cache for country code lookups
let countryNameToCodeMap = null;

/**
 * Get country code by country name
 * @param {string} countryName - Full country name (e.g., "India")
 * @returns {string} - Country code (e.g., "IN")
 */
export const getCountryCode = (countryName) => {
  if (!countryName) return null;

  // Build cache on first use
  if (!countryNameToCodeMap) {
    countryNameToCodeMap = {};
    Country.getAllCountries().forEach(country => {
      countryNameToCodeMap[country.name] = country.isoCode;
    });
  }

  return countryNameToCodeMap[countryName] || null;
};

/**
 * Get state code by country code and state name
 * @param {string} countryCode - Country code (e.g., "IN")
 * @param {string} stateName - Full state name (e.g., "Maharashtra")
 * @returns {string} - State code (e.g., "MH")
 */
export const getStateCode = (countryCode, stateName) => {
  if (!countryCode || !stateName) return null;

  try {
    const states = State.getStatesOfCountry(countryCode);
    const state = states.find(s => s.name === stateName);
    return state ? state.isoCode : null;
  } catch (error) {
    console.error('Error getting state code:', error);
    return null;
  }
};

/**
 * Get all countries list sorted alphabetically
 * @returns {array} - Array of country names
 */
export const getAllCountries = () => {
  return Country.getAllCountries()
    .map(c => c.name)
    .sort((a, b) => a.localeCompare(b));
};

/**
 * Search countries with support for aliases (e.g., "USA" -> "United States")
 * @param {string} searchTerm - Search term
 * @returns {array} - Array of matching country objects {name, code}
 */
export const searchCountries = (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return getAllCountriesWithCodes();
  }

  const term = searchTerm.toLowerCase().trim();
  const countries = getAllCountriesWithCodes();

  // Country aliases for common searches
  const aliases = {
    'usa': 'United States',
    'us': 'United States',
    'uk': 'United Kingdom',
    'gb': 'United Kingdom',
    'uae': 'United Arab Emirates',
    'india': 'India',
    'in': 'India',
  };

  // Check if search term matches an alias
  const aliasMatch = aliases[term];
  if (aliasMatch) {
    return countries.filter(c => c.name.toLowerCase() === aliasMatch.toLowerCase());
  }

  // Standard search by name or code
  return countries.filter(c =>
    c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term)
  );
};

/**
 * Get all countries with their codes
 * @returns {array} - Array of country objects {name, code}
 */
export const getAllCountriesWithCodes = () => {
  return Country.getAllCountries()
    .map(c => ({
      name: c.name,
      code: c.isoCode
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};/**
 * Search states with fuzzy matching and aliases support
 * @param {string} countryCode - Country code (e.g., "US")
 * @param {string} searchTerm - Search term
 * @returns {array} - Array of matching state objects {name, code}
 */
export const searchStates = (countryCode, searchTerm) => {
  if (!countryCode) return [];
  if (!searchTerm || searchTerm.trim() === '') {
    return getAllStatesWithCodes(countryCode);
  }

  const term = searchTerm.toLowerCase().trim();
  const states = getAllStatesWithCodes(countryCode);

  // State aliases mapping (e.g., "CA" -> "California")
  const stateAliases = {
    'ca': 'California',
    'ny': 'New York',
    'tx': 'Texas',
    'fl': 'Florida',
    'il': 'Illinois',
    'pa': 'Pennsylvania',
    'oh': 'Ohio',
    'ga': 'Georgia',
    'nc': 'North Carolina',
    'mi': 'Michigan',
    'mh': 'Maharashtra',
    'up': 'Uttar Pradesh',
    'ka': 'Karnataka',
    'tn': 'Tamil Nadu',
    'gj': 'Gujarat',
  };

  // Check if search term matches an alias
  const aliasMatch = stateAliases[term];
  if (aliasMatch) {
    return states.filter(s => s.name.toLowerCase() === aliasMatch.toLowerCase());
  }

  // Standard search by name or code
  return states.filter(s =>
    s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term)
  );
};

/**
 * Get all states of a country with their codes
 * @param {string} countryCode - Country code (e.g., "US")
 * @returns {array} - Array of state objects {name, code}
 */
export const getAllStatesWithCodes = (countryCode) => {
  if (!countryCode) return [];

  try {
    return State.getStatesOfCountry(countryCode)
      .map(s => ({
        name: s.name,
        code: s.isoCode
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting states:', error);
    return [];
  }
};

/**
 * Search cities with fuzzy matching
 * @param {string} countryCode - Country code (e.g., "US")
 * @param {string} stateCode - State code (e.g., "CA")
 * @param {string} searchTerm - Search term
 * @returns {array} - Array of matching city objects {name}
 */
export const searchCities = (countryCode, stateCode, searchTerm) => {
  if (!countryCode || !stateCode) return [];
  if (!searchTerm || searchTerm.trim() === '') {
    return getAllCitiesWithNames(countryCode, stateCode);
  }

  const term = searchTerm.toLowerCase().trim();
  const cities = getAllCitiesWithNames(countryCode, stateCode);

  // Search by city name
  return cities.filter(c =>
    c.name.toLowerCase().includes(term)
  );
};

/**
 * Check if cities are available for a state
 * @param {string} countryCode - Country code
 * @param {string} stateCode - State code
 * @returns {boolean} - True if cities are available
 */
export const hasCitiesData = (countryCode, stateCode) => {
  if (!countryCode || !stateCode) return false;
  
  try {
    const cities = City.getCitiesOfState(countryCode, stateCode);
    return cities && cities.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Get all cities of a state
 * @param {string} countryCode - Country code (e.g., "US")
 * @param {string} stateCode - State code (e.g., "CA")
 * @returns {array} - Array of city objects {name}
 */
export const getAllCitiesWithNames = (countryCode, stateCode) => {
  if (!countryCode || !stateCode) return [];

  try {
    const cities = City.getCitiesOfState(countryCode, stateCode);
    
    if (!cities || cities.length === 0) {
      console.warn(`No cities found for ${countryCode}-${stateCode}`);
      return [];
    }
    
    return cities
      .map(c => ({
        name: c.name
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting cities:', error);
    return [];
  }
};
