import express from 'express';
import { storyController } from '../controller/story_controller';
import { uploadStoryMedia } from "../middlewares/upload";
import tokenValidationMiddleware from '../middlewares/token_validator';
import {statusChecker} from '../middlewares/status_middleware';

const router = express.Router();

router.use(tokenValidationMiddleware);
router.use(statusChecker);

router.post('/create', (req, res, next) => {
    uploadStoryMedia.array("media")(req, res, function (err) {
        if (err) {
            console.error('Upload Error:', err);
            return res.status(400).json({ message: err.message || 'File upload failed' });
        }
        next();
    });
}, storyController.createStory);

router.get('/feed', storyController.getStories);
router.get('/get-user-posted-story', storyController.getUserPostedStories);
router.post('/view-story', storyController.viewManyStories);
router.get('/get-story-viewers/:storyId/:storyItemId', storyController.getStoryViewers);
router.delete('/delete-story/:storyId', storyController.deleteStory);

export default router;