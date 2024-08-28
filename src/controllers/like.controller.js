import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    const like = await Like.findOne({video: videoId, likedBy: req.user._id})

    if(like){
        await like.remove()
        return res.json(new ApiResponse(200, "Video unliked"))
    }
    const newLike = await Like.create({video: videoId, likedBy: req.user._id})
    const addedlike=await like.findById(newLike._id)
    if(!addedlike){
        throw new ApiError(500, "Failed to like video")
    }
    return res.json(new ApiResponse(200,addedlike,"Video liked"))
    
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    const like = await Like.findOne({comment: commentId, likedBy: req.user._id})

    if(like){
        await like.remove()
        return res.json(new ApiResponse(200, "Comment unliked"))
    }
    const newLike = await Like.create({comment: commentId, likedBy: req.user._id})
    const addedlike=await like.findById(newLike._id)
    if(!addedlike){
        throw new ApiError(500, "Failed to like comment")
    }
    return res.status(200).json(new ApiResponse(200,addedlike,"Comment liked"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }

    const like = await Like.findOne({tweet: tweetId, likedBy: req.user._id})

    if(like){
        await like.remove()
        return res.status(200).json(new ApiResponse(200, "Tweet unliked"))
    }
    const newLike = await Like.create({tweet: tweetId, likedBy: req.user._id})
    const addedlike=await like.findById(newLike._id)
    if(!addedlike){
        throw new ApiError(500, "Failed to like tweet")
    }
    return res.status(200).json(new ApiResponse(200,addedlike,"Tweet liked"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user?._id
    if(!userId){
        throw new ApiError(401, "Unauthorized")
    }

    const getALLLikedVideos=await Like.aggregate([
        {
           $match:{
            video:{$exists:true},
            likedBy:new mongoose.Types.ObjectId(userId)
           } 
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"videos",
                pipeline:[
                    {$lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:
                                {
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                    }},
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                video:{
                    $first:"$videos"
                }
            }
        }
    ])

    if(!getALLLikedVideos){
        throw new ApiError(500, "Failed to get liked videos")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, getALLLikedVideos, "Liked videos successfully fetched"))



})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}