
export const REFERRAL_CONFIG = {
  COMMISSION_RATE: 0.20,
  MIN_WITHDRAWAL_AMOUNT: 10,
  CURRENCY: "USD",
  

  INVITEE_WELCOME_BONUS: {
    enabled: true,
    type: "credits" as const,
    amount: 3,
  },
} as const;


export const calculateCommission = (
  subscriptionAmount: number,
  commissionRate: number = REFERRAL_CONFIG.COMMISSION_RATE
): number => {
  return Math.floor(subscriptionAmount * commissionRate);
};

export const applyWelcomeBonus = (
  currentCredits: number
): { credits: number } => {
  if (REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.enabled) {
    return {
      credits: currentCredits + REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.amount,
    };
  }
  return { credits: currentCredits };
};