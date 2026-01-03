import { Country, State, City } from 'country-state-city';
let countryNameToCodeMap = null;
export const getCountryCode = countryName => {
  if (!countryName) return null;
  if (!countryNameToCodeMap) {
    countryNameToCodeMap = {};
    Country.getAllCountries().forEach(country => {
      countryNameToCodeMap[country.name] = country.isoCode;
    });
  }
  return countryNameToCodeMap[countryName] || null;
};
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
export const getAllCountries = () => {
  return Country.getAllCountries().map(c => c.name).sort((a, b) => a.localeCompare(b));
};
export const searchCountries = searchTerm => {
  if (!searchTerm || searchTerm.trim() === '') {
    return getAllCountriesWithCodes();
  }
  const term = searchTerm.toLowerCase().trim();
  const countries = getAllCountriesWithCodes();
  const aliases = {
    'usa': 'United States',
    'us': 'United States',
    'uk': 'United Kingdom',
    'gb': 'United Kingdom',
    'uae': 'United Arab Emirates',
    'india': 'India',
    'in': 'India'
  };
  const aliasMatch = aliases[term];
  if (aliasMatch) {
    return countries.filter(c => c.name.toLowerCase() === aliasMatch.toLowerCase());
  }
  return countries.filter(c => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term));
};
export const getAllCountriesWithCodes = () => {
  return Country.getAllCountries().map(c => ({
    name: c.name,
    code: c.isoCode
  })).sort((a, b) => a.name.localeCompare(b.name));
};
export const searchStates = (countryCode, searchTerm) => {
  if (!countryCode) return [];
  if (!searchTerm || searchTerm.trim() === '') {
    return getAllStatesWithCodes(countryCode);
  }
  const term = searchTerm.toLowerCase().trim();
  const states = getAllStatesWithCodes(countryCode);
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
    'gj': 'Gujarat'
  };
  const aliasMatch = stateAliases[term];
  if (aliasMatch) {
    return states.filter(s => s.name.toLowerCase() === aliasMatch.toLowerCase());
  }
  return states.filter(s => s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term));
};
export const getAllStatesWithCodes = countryCode => {
  if (!countryCode) return [];
  try {
    return State.getStatesOfCountry(countryCode).map(s => ({
      name: s.name,
      code: s.isoCode
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting states:', error);
    return [];
  }
};
export const searchCities = (countryCode, stateCode, searchTerm) => {
  if (!countryCode || !stateCode) return [];
  if (!searchTerm || searchTerm.trim() === '') {
    return getAllCitiesWithNames(countryCode, stateCode);
  }
  const term = searchTerm.toLowerCase().trim();
  const cities = getAllCitiesWithNames(countryCode, stateCode);
  return cities.filter(c => c.name.toLowerCase().includes(term));
};
export const hasCitiesData = (countryCode, stateCode) => {
  if (!countryCode || !stateCode) return false;
  try {
    const cities = City.getCitiesOfState(countryCode, stateCode);
    return cities && cities.length > 0;
  } catch (error) {
    return false;
  }
};
export const getAllCitiesWithNames = (countryCode, stateCode) => {
  if (!countryCode || !stateCode) return [];
  try {
    const cities = City.getCitiesOfState(countryCode, stateCode);
    if (!cities || cities.length === 0) {
      console.warn(`No cities found for ${countryCode}-${stateCode}`);
      return [];
    }
    return cities.map(c => ({
      name: c.name
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting cities:', error);
    return [];
  }
};