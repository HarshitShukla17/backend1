import { Router } from "express";
import {verifyJwtToken} from "../middlewares/auth.middleware.js";

import {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
} from "../controllers/like.controller.js";

const likeRouter = Router();

likeRouter.use(verifyJwtToken);

likeRouter.route('/toggle/v/:videoId').post(toggleVideoLike);
likeRouter.route('/toggle/c/:commentId').post(toggleCommentLike);
likeRouter.route('/toggle/t/:tweetId').post(toggleTweetLike);
likeRouter.route('/videos').get(getLikedVideos);

export default likeRouter;
