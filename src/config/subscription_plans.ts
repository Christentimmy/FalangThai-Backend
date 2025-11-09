
import dotenv from "dotenv";
dotenv.config();

if (!process.env.FALANGBASICPRICEID || !process.env.FALANGPREMIUMPRICEID || !process.env.FALANGPREMIUMPLUSPRICEID) {
  throw new Error("Please add the subscription plans to the .env file");
}

export const PLANS = {
  BASIC: {
    id: "basic_monthly",
    name: "Basic",
    billingCycle: "month",
    billingPeriodMonths: 1,
    price: 9,
    currency: "USD",
    stripePriceId: process.env.FALANGBASICPRICEID.toString(),
    features: [
      "Unlimited swipes",
      "See who viewed your profile",
      "Rewind last swipe",
      "Super Likes per day: 1",
      "Boosts per month: 1",
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
    currency: "USD",
    stripePriceId: process.env.FALANGPREMIUMPRICEID.toString(), 
    features: [
      "All Basic features",
      "Advanced filters",
      "See who liked you",
      "Ad-free experience",
      "Super Likes per day: 3",
      "Boosts per month: 2",
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
    currency: "USD",
    stripePriceId: process.env.FALANGPREMIUMPLUSPRICEID.toString(), 
    features: [
      "All Premium features",
      "Change location (Travel mode)",
      "Priority support",
      "Super Likes per day: 5",
      "Boosts per month: 3",
    ],
    limits: {
      superLikesPerDay: 5,
      boostsPerMonth: 3,
    },
  },
} as const;




