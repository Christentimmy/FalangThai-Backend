import cron from 'node-cron';
import User from '../models/user_model';

const initResetTask = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('--- Running Daily Limit Reset Job ---');
        
        try {
            const result = await User.updateMany(
                {}, // Select all users
                { 
                    $set: { 
                        daily_swipes: 0, 
                        daily_messages: 0 
                    } 
                }
            );
            
            console.log(`Successfully reset limits for ${result.modifiedCount} users.`);
        } catch (error) {
            console.error('Error resetting daily limits:', error);
        }
    }, {
        timezone: "UTC" 
    });
};

initResetTask();