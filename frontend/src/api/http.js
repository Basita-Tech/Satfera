import axios from "axios";
import { getCSRFToken } from "../utils/csrfProtection";
const API = import.meta.env.VITE_API_URL;
const client = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 10000
});
client.interceptors.request.use(config => {
  try {
    config.headers = config.headers || {};
    const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
    if (!isFormData && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
    const method = (config.method || "get").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
  } catch (e) {}
  return config;
}, err => Promise.reject(err));
client.interceptors.response.use(response => response, async error => {
  const config = error?.config;
  const status = error?.response?.status;
  const method = (config?.method || "get").toLowerCase();
  const isTransient = !error.response || [429, 502, 503, 504].includes(status);
  if (config && method === "get" && !config.__retried && isTransient) {
    config.__retried = true;
    const delay = 200 + Math.random() * 150;
    await new Promise(resolve => setTimeout(resolve, delay));
    return client(config);
  }
  return Promise.reject(error);
});
export default client;