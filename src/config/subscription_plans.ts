
export const PLANS = {
  BASIC: {
    id: "basic_monthly",
    name: "Basic",
    billingCycle: "month",
    billingPeriodMonths: 1,
    price: 9,
    currency: "EUR",
    stripePriceId: "price_1SDCuq2fYqVtcus2nvrXb7zI",
    features: [
      "Unlimited swipes",
      "See who viewed your profile",
      "Rewind last swipe",
    ],
    limits: {
      superLikesPerDay: 1,
      boostsPerMonth: 1,
    },
  },
  PREMIUM: {
    id: "premium_6_months",
    name: "Premium",
    billingCycle: "6_months",
    billingPeriodMonths: 6,
    price: 54,
    currency: "EUR",
    stripePriceId: "price_1SDCw72fYqVtcus2qrEwPtfn", 
    features: [
      "All Basic features",
      "Advanced filters (age, distance, interests)",
      "Ad-free experience",
    ],
    limits: {
      superLikesPerDay: 3,
      boostsPerMonth: 2,
    },
  },
  PREMIUM_PLUS: {
    id: "premium_plus_12_months",
    name: "Premium Plus",
    billingCycle: "12_months",
    billingPeriodMonths: 12,
    price: 108,
    currency: "EUR",
    stripePriceId: "price_1SDCx12fYqVtcus2tHTlyPFf", 
    features: [
      "All Premium features",
      "See who liked you",
      "Change location (Travel mode)",
      "Priority support",
    ],
    limits: {
      superLikesPerDay: 5,
      boostsPerMonth: 3,
    },
  },
} as const;




