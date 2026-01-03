import Cookies from "js-cookie";
const CSRF_TOKEN_KEY = "csrf_token";
export const getCSRFToken = () => {
  const cookieToken = Cookies.get(CSRF_TOKEN_KEY);
  return cookieToken || null;
};
export const addCSRFHeader = (headers = {}) => {
  const token = getCSRFToken();
  if (!token) return headers;
  return {
    ...headers,
    "X-CSRF-Token": token
  };
};
export const getCSRFFormField = () => {
  return {
    _csrf: getCSRFToken()
  };
};
export default {
  getCSRFToken,
  addCSRFHeader,
  getCSRFFormField
};