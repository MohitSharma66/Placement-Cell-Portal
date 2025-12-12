// Create a config file: src/config.js
const config = {
  API_URL: import.meta.env.VITE_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? '/api'  // Relative path when served by Nginx
      : 'http://localhost:5000/api')  // Local dev
};

export default config;