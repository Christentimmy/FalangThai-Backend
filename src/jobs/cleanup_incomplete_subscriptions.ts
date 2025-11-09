// src/jobs/cleanup_incomplete_subscriptions.ts
import { CronJob } from "cron";
import Subscription from "../models/subscription_model";

const CLEANUP_INTERVAL = "*/5 * * * *"; 

export const startIncompleteSubscriptionsCleanup = () => {
  const job = new CronJob(CLEANUP_INTERVAL, async () => {
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        const result = await Subscription.deleteMany({
          status: "incomplete",
          createdAt: { $lt: thirtyMinutesAgo }
        });

        if (result.deletedCount > 0) {
          console.log(`Cleaned up ${result.deletedCount} incomplete subscriptions`);
        }
      } catch (error) {
        console.error("Error cleaning up incomplete subscriptions:", error);
      }
    },
    null,
    true,
    "UTC"
  );

  console.log("Incomplete subscriptions cleanup job started");
  return job;
};


startIncompleteSubscriptionsCleanup();
