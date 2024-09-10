import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    
    const userId=req.user?._id

    const videoStats=await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"video",
                as:"totalComments"
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"totalLikesOnVideo"
            }
        },
        {

            $group:{
                _id:null,
                totalVideosCount:{$sum:1},
                totalViewsOnVideo:{$sum:"$views"},
                totalCommentOnVideo:{$sum:{$size:"$totalComments"}},
                totalLikesOnVideo:{$sum:{$size:"$totalLikesOnVideo"}}
            }
        }
    ])

    const subscriptionStats=await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group:{
                _id:null,
                totalSubscriptionOnVideo:{$sum:1}
            }
        }
    ])

    const likesOnVideosCommentsStats=await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"video",
                as:"totalComments"
            }
        },
        {
            $unwind:"$totalComments"
        },
        {
            $lookup:{
                from:"likes",
                localField:"totalComments._id",
                foreignField:"comment",
                as:"totalLikesOnComments"
            }
        },
        {
            $group:{
                _id:null,
                totalLikesOnComments:{$sum:{$size:"$totalLikes"}}
            }
        }
    ])

      // Combined stats using the spread operator
      const combinedStats = {
        ...videoStats[0],
        ...subscriptionStats[0],
        ...likesOnVideosCommentsStats[0]
    };

    return res.status(200).json(new ApiResponse(200, combinedStats, "Channel stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId=req.user?._id;
    const videos=await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"totalLikes"
            }
        },
        {
            $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"video",
                as:"totalComments"
            }
        },
        {
            $addFields:{
                totalLikes:{$size:"$totalLikes"},
                totalComments:{$size:"$totalComments"},
            }
        }

    ])
    if (!videos?.length) {
        throw new ApiError(404, "You haven't uploaded a video yet.")
    }

    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"))

})

export {
    getChannelStats, 
    getChannelVideos
    }