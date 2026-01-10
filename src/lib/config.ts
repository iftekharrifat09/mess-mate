// API Configuration
// Change USE_BACKEND to true when your backend server is running
export const USE_BACKEND = true;

// Backend API URL - Update this to your deployed backend URL
export const API_BASE_URL = 'http://localhost:5000/api';

// MongoDB connection status
let mongoDbConnected = false;

export function setMongoDbConnected(status: boolean) {
  mongoDbConnected = status;
}

export function isMongoDbConnected() {
  return mongoDbConnected;
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
