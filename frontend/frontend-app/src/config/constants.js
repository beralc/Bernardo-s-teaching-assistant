export const API_BASE_URL = process.env.REACT_APP_FLASK_API_URL || 'http://127.0.0.1:5000';

// Tier limits for voice conversations
export const TIER_LIMITS = {
  free: {
    monthlyMinutes: 5,  // 5 minutes per month for testing (change to 30 for production)
    name: 'Free'
  },
  starter: {
    monthlyMinutes: 150,  // 150 minutes per month = ~$9 cost
    name: 'Starter'
  },
  premium: {
    monthlyMinutes: 300,  // 300 minutes per month = ~$18 cost
    name: 'Premium'
  },
  enterprise: {
    monthlyMinutes: -1,  // unlimited
    name: 'Enterprise'
  }
};
