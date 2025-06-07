const API_BASE_URL = "http://ip:5000";
GOOGLE_MAPS_API_KEY = "your google api key";

export default {
  API_BASE_URL: process.env.API_BASE_URL || "http://ip:5000",
  GOOGLE_MAPS_API_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || 'Stripr_api_key',
};
