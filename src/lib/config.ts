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
let healthCheckInProgress = false;
const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds cache (increased from 30s)

// Once backend is confirmed working, we trust it for longer
let backendConfirmedWorking = false;

export function setMongoDbConnected(status: boolean) {
  mongoDbConnected = status;
  lastHealthCheck = Date.now();
  if (status) {
    backendConfirmedWorking = true;
  }
}

export function isMongoDbConnected() {
  return mongoDbConnected;
}

export function setBackendAvailable(status: boolean) {
  backendAvailable = status;
  if (status) {
    backendConfirmedWorking = true;
  }
}

export function isBackendAvailable() {
  return backendAvailable;
}

// Check if health check is still valid (within cache interval)
export function isHealthCheckValid() {
  // If backend was confirmed working, use longer cache
  if (backendConfirmedWorking) {
    return Date.now() - lastHealthCheck < HEALTH_CHECK_INTERVAL * 2;
  }
  return Date.now() - lastHealthCheck < HEALTH_CHECK_INTERVAL;
}

export function setHealthCheckInProgress(status: boolean) {
  healthCheckInProgress = status;
}

export function isHealthCheckInProgress() {
  return healthCheckInProgress;
}

// Check if we should use backend (backend available AND MongoDB connected)
// If health check hasn't happened yet, return false to use localStorage
export function shouldUseBackend() {
  // If USE_BACKEND is false, always use localStorage
  if (!USE_BACKEND) return false;
  
  // If backend was confirmed working before, trust it
  if (backendConfirmedWorking && backendAvailable && mongoDbConnected) return true;
  
  // If health check was done and backend+mongo are available, use backend
  if (backendAvailable && mongoDbConnected) return true;
  
  // Otherwise use localStorage
  return false;
}

// Reset backend confirmation (useful for reconnection scenarios)
export function resetBackendConfirmation() {
  backendConfirmedWorking = false;
  lastHealthCheck = 0;
}

// Demo configuration for testing
export const CONFIG = {
  // Set to true to use backend API instead of localStorage
  useBackend: USE_BACKEND,
  
  // API endpoints
  api: {
    baseUrl: API_BASE_URL,
    timeout: 5000, // 5 seconds (reduced from 15s for faster feedback)
  },
};
