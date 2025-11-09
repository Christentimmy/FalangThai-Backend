
import { CronJob } from 'cron';
import Subscription from '../models/subscription_model';
import User from '../models/user_model';

// Run every 5 minutes
const JOB_SCHEDULE = '*/5 * * * *';

function startSubscriptionJob() {
  const job = new CronJob(JOB_SCHEDULE, async () => {
    try {
      const now = new Date();
      
      // Find subscriptions that are past due and not already marked as such
      const pastDueSubs = await Subscription.find({
        currentPeriodEnd: { $lt: now },
        status: { $ne: 'canceled' }
      }).populate('userId');

      for (const sub of pastDueSubs) {
        try {
          // Update user's subscription status
          await User.findByIdAndUpdate(sub.userId, {
            'subscription.status': 'past_due',
            'subscription.cancelAtPeriodEnd': false
          });

          await Subscription.deleteOne({ _id: sub._id });

        } catch (error) {
          console.error(`Error processing subscription ${sub._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in subscription job:', error);
    }
  });

  job.start();
}

startSubscriptionJob();