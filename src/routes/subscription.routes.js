import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import {verifyJwtToken} from "../middlewares/auth.middleware.js"

const subscriptionRouter = Router();
subscriptionRouter.use(verifyJwtToken); // Apply verifyJWT middleware to all routes in this file

subscriptionRouter
    .route("/c/:channelId")
    .get(getSubscribedChannels)
    .post(toggleSubscription);

    subscriptionRouter.route("/u/:subscriberId").get(getUserChannelSubscribers);

export default subscriptionRouter