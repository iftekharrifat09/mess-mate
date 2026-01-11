// API Configuration
// Uses environment variable for API URL, falls back to localhost for development
// IMPORTANT: When deploying, set VITE_API_BASE_URL in .env file (e.g., http://your-server:5000/api)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Backend enabled flag - set to true to use backend API
// This can also be controlled via VITE_USE_BACKEND environment variable
export const USE_BACKEND = import.meta.env.VITE_USE_BACKEND !== 'false';

// MongoDB connection status - cached to avoid repeated checks
let mongoDbConnected = false;
let backendAvailable = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds cache

export function setMongoDbConnected(status: boolean) {
  mongoDbConnected = status;
  lastHealthCheck = Date.now();
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

// Check if health check is still valid (within cache interval)
export function isHealthCheckValid() {
  return Date.now() - lastHealthCheck < HEALTH_CHECK_INTERVAL;
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
    timeout: 15000, // 15 seconds (increased for slower connections)
  },
};
