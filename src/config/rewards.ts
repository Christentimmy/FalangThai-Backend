
export const INVITATION_REWARDS = {
    // Reward for the inviter (person who shared the code)
    INVITER: {
      type: "credits" as const,
      amount: 3, // Gets 3 free premium requests
    },
  
    // Reward for the invitee (person who used the code)
    INVITEE: {
      type: "credits" as const,
      amount: 6, // Gets 6 free premium requests
    },

    
  };
  
  /**
   * Apply reward to user
   */
  export const applyReward = (
    currentCredits: number,
    currentExpiresAt: Date | undefined,
    reward: typeof INVITATION_REWARDS.INVITER
  ): { credits: number; expiresAt?: Date } => {
    if (reward.type === "credits") {
      return {
        credits: currentCredits + reward.amount,
        expiresAt: currentExpiresAt,
      };
    }
  
    if (reward.type === "time") {
      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + reward.amount * 60 * 60 * 1000);
      
      // Extend existing premium time if it exists
      if (currentExpiresAt && currentExpiresAt > now) {
        newExpiresAt.setTime(currentExpiresAt.getTime() + reward.amount * 60 * 60 * 1000);
      }
      
      return {
        credits: currentCredits,
        expiresAt: newExpiresAt,
      };
    }
  
    return { credits: currentCredits, expiresAt: currentExpiresAt };
  };