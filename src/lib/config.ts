// API Configuration
// Uses environment variable for API URL, falls back to localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Backend enabled flag - set to true to use backend API
export const USE_BACKEND = true;

// MongoDB connection status
let mongoDbConnected = false;
let backendAvailable = false;

export function setMongoDbConnected(status: boolean) {
  mongoDbConnected = status;
}

export function isMongoDbConnected() {
  return mongoDbConnected;
}

export function setBackendAvailable(status: boolean) {
  backendAvailable = status;
}

export function isBackendAvailable() {
  return backendAvailable;
}

// Check if we should use backend (backend available AND MongoDB connected)
export function shouldUseBackend() {
  return USE_BACKEND && backendAvailable && mongoDbConnected;
}

// Demo configuration for testing
export const CONFIG = {
  // Set to true to use backend API instead of localStorage
  useBackend: USE_BACKEND,
  
  // API endpoints
  api: {
    baseUrl: API_BASE_URL,
    timeout: 10000, // 10 seconds
  },
};
