// src/config/api.js
// Single source of truth for the backend API base URL.
// Override with VITE_API_URL env var (e.g. in .env.production).
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://sigma-gpt-backend-obn8.onrender.com";

export default API_BASE_URL;
