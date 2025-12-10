import axios from "axios";
import { getCSRFToken } from "../utils/csrfProtection";

// Ensure cookies are sent with every request
axios.defaults.withCredentials = true;

// Request interceptor: set headers and CSRF token
axios.interceptors.request.use(
  (config) => {
    try {
      config.headers = config.headers || {};

      // Only set Content-Type for non-FormData payloads
      const isFormData =
        typeof FormData !== "undefined" && config.data instanceof FormData;
      if (!isFormData && !config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }

      // Add CSRF token for mutating methods
      const method = (config.method || "get").toLowerCase();
      if (["post", "put", "patch", "delete"].includes(method)) {
        const csrfToken = getCSRFToken();
        if (csrfToken) {
          config.headers["X-CSRF-Token"] = csrfToken;
        }
      }

      // No Authorization header needed; authentication via HttpOnly cookie
    } catch (e) {
      // no-op
    }
    return config;
  },
  (err) => Promise.reject(err)
);

export default axios;
