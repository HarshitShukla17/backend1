import {Video} from "../models/video.model.js";
import {User}  from "../models/user.model.js";
import {Comment} from "../models/comment.model.js";
import {Like} from "../models/like.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {deleteOnCloudinary} from "../utils/cloudinary.js";
import mongoose,{isValidObjectId} from "mongoose";
import {ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parse } from "dotenv";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="title", sortType="asc", username } = req.query
    //TODO: get all videos based on query, sort, pagination
    if(page < 1) throw new ApiError(400, "Invalid page number")
    if(limit < 1) throw new ApiError(400, "Invalid limit number")
    if(!sortBy||!['title','createdAt','views'].includes(sortBy)) throw new ApiError(400, "Invalid sortBy value")
    if(!sortType||!['asc','desc'].includes(sortType)) throw new ApiError(400, "Invalid sortType value")
    if(!query&&!username) throw new ApiError(400, "query or username is required")

    let pipelineToFindVideosUsingTitleAndDescription = [
        {$match:{
            $or:[{title:{$regex:new RegExp(query,'i')}},
                {description:{$regex:new RegExp(query,'i')}}]
        }},
        {$sort:{[sortBy]:sortType === 'asc'?1:-1}},
        {$skip:(page-1)*parseInt(limit)},
        {$lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"owner",
            pipeline:[
                {$project:{
                    fullName:1,
                    username:1,
                    email:1
                }}
            ]
        }},
        {$addFields:{
            ownerDetails:{$arrayElemAt:['$owner',0]}
        }},
        {$limit:parseInt(limit)}
    ]

    let pipelineToFindVideosUsingUsername=[
        {$lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"user",
            pipeline:[
                {$project:{
                    fullName:1,
                    username:1,
                    email:1
                }},
                
            ]
        }},
        {$match:{
            $or:[{'user.username':{$regex:new RegExp(username,"i")}}]
        }},
        {$sort:{[sortBy]:sortType === 'asc'?1:-1}},
        {$skip:(page-1)*parseInt(limit)},
        
        {$addFields:{
            ownerDetails:{$arrayElemAt:['$user',0]}
        }},
        {$limit:parseInt(limit)}

    ]

    let pipeline;
    if(username){
        pipeline=pipelineToFindVideosUsingUsername
    }else{
        pipeline=pipelineToFindVideosUsingTitleAndDescription
    }

    let videos = await Video.aggregate(pipeline)
    if(!videos) throw new ApiError(500, "Error during fetching the videos")
    
    const totalVideos=videos.length
    const totalPages=Math.ceil(totalVideos/limit)

    return res
    .status(200)
    .json(new ApiResponse(200, {videos, totalVideos, totalPages}, "Videos fetched successfully"))

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    const user = req.user
    if([title,description].some((field)=>field.trim()==="")) throw new ApiError(400, "Title and description are required") 
    
    const videoLocalFilePath = req?.files?.videoFile[0]?.path
    const thumbnailLocalFilePath = req?.files?.thumbnail[0]?.path

    if(!videoLocalFilePath||!thumbnailLocalFilePath) throw new ApiError(400, "Video file and thumbnail are required")

    const videoFile = await uploadOnCloudinary(videoLocalFilePath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath)
    
    if(!videoFile||!thumbnail) throw new ApiError(500, "Error during uploading the video or thumbnail")
    
    const video=await Video.create({
        videoFile:videoFile?.url,
        thumbnail:thumbnail?.url,
        title,
        description,
        duration:videoFile?.duration,
        views:0,
        isPublished:true,
        owner:user._id
    })

    const uploadedVideo=await Video.find(video._id)
    if(!uploadedVideo) throw new ApiError(500, "Error during fetching the uploaded video")
    
    
    return res
    .status(200)
    .json(new ApiResponse(200, uploadedVideo, "Video published successfully"))


   // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    await Video.findByIdAndUpdate(videoId,{$inc:{views:1}});
    

    if(!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id")
        const video = await Video.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(videoId),
                    isPublished: true
                }
            },
            {
                $facet: {
                    getAVideo: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            username: 1,
                                            fullName: 1,
                                            email: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ],
                    totalLikesCommentsAndSubscription: [
                        {
                            $lookup: {
                                from: "likes",
                                localField: "_id",
                                foreignField: "video",
                                as: "totalLikesOnVideo"
                            }
                        },
                        {
                            $addFields: {
                                likedByUser: {
                                    $in: [req.user?._id, "$totalLikesOnVideo.likedBy"]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "comments",
                                localField: "_id",
                                foreignField: "video",
                                as: "totalComments"
                            },
                        },
                        {
                            $lookup: {
                                from: "subscriptions",
                                localField: "owner",
                                foreignField: "channel",
                                as: "subscribers"
                            }
                        },
                        {
                            $addFields: {
                                isSubscribedTo: {
                                    $in: [req.user?._id, "$subscribers.subscriber"]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                TotalLikesOnVideo: { $sum: { $size: "$totalLikesOnVideo" } },
                                TotalComments: { $sum: { $size: "$totalComments" } },
                                TotalSubscribers: { $sum: { $size: "$subscribers" } },
                                isSubscribedTo: { $first: "$isSubscribedTo" },
                                likedByUser: { $first: "$likedByUser" }
                            }
                        }
                    ]
                }
            },
        ])

        if (!video[0].getAVideo.length) {
            throw new ApiError(404, "Video does not exist")
        }
         // add videoId to watchHistory of the user
         const user = await User.findById(req.user?._id)
         const matchedVideo = user.watchHistory.find((video) => video.equals(videoId));
         if (!matchedVideo) {
             user.watchHistory.push(videoId)
             await user.save();
         }
     
         return res.status(200).json(new ApiResponse(200, video[0], "video fetched successfully"))
        
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId))
        {
            throw new ApiError(400,"please provide valid videoId")
        }
    
        const {title,description}=req.body
        console.log(req.file)
        const thumbnailLocalFilePath=req.file?.path
          
        if (!title || title.trim() === "" || !description || description.trim() === "" || !thumbnailLocalFilePath) {
            throw new ApiError(400, "All fields are required")
        }
         
        const video=await Video.findById(videoId)
        

        if(!video)
        {
            throw new ApiError(404,"no video found")
        }
    
        if(req.user?._id.toString()!=video.owner.toString())
        {
            throw new ApiError(404,"You are not allowed to edit this video")
        }
    
        const thumbnail=await uploadOnCloudinary(thumbnailLocalFilePath)
    
        if(!thumbnail.url)
        {
            throw new ApiError(500,"error in uploading the thumbnail")
        }
        
        const session=await mongoose.startSession()
        session.startTransaction();
        try {
            const updatedVideo=await Video.findByIdAndUpdate(videoId,
                {
                    $set:{
                        title,
                        description,
                        thumbnail:thumbnail.url
                    }
    
                },
                {
                    new:true,
                    session
                }
            )
            //deleting old thumbnail
            const oldthumbnail=video.thumbnail
            await deleteOnCloudinary(oldthumbnail)
            
            await session.commitTransaction();
            return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
        } catch (error) {
            await session.abortTransaction();
            if (thumbnail.url) {
                const getPublicIdOfNewThumbnail = thumbnail.url.split("/").pop().split(".")[0];
                await deleteOnCloudinary(getPublicIdOfNewThumbnail);
            }
            throw new ApiError(500, "Error while updating the thumbnail")
        }
        finally {
            session.endSession();
        }  
    
    
    

    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(videoId.trim()==="")
    {
        throw new ApiError(400,"please provide valid videoId")
    }
    //TODO: delete video
    //1. check if videoId is valid
    //2. check if video exists
    //3. check if the user is the owner of the video
    //__ delete the comments and likes of the video
    //4. delete the video
    //5. delete the video from cloudinary
    //6. return the response

    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"please provide valid videoId")
    }

    const video = await Video.findById(videoId)
    if(!video)
    {
        throw new ApiError(404,"no video found")
    }

    if(req.user?._id.toString()!=video.owner.toString())
    {
        throw new ApiError(404,"You are not allowed to delete this video")
    }

    const session=await mongoose.startSession()
    session.startTransaction();
    try {
        const comments=await Comment.find({video:video._id})
        //delete the likes of comments
        if(comments.length>0)
        {
            for(const comment of comments)
                {
                    await Like.deleteMany({comment:comment?._id})
                }
                await Comment.deleteMany({video:video._id})
        }
        const likes=await Like.find({video:video._id})
        if(likes.length>0)
        {
            await Like.deleteMany({video:video._id})
        }
        
        //delete comments and likes from video and video
        
        
        await Video.findByIdAndDelete(videoId)
        await deleteOnCloudinary(video.thumbnail)
        await deleteOnCloudinary(video.videoFile)
        await session.commitTransaction();
        return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"))
    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, "Error while deleting the video")
    }
    finally {
        session.endSession();
    }


})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //TODO: toggle the publish status of the video
    //1. check if videoId is valid
    //2. check if video exists
    //3. check if the user is the owner of the video
    //4. toggle the publish status
    //5. return the response

    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"please provide valid videoId")
    }

    const video = await Video.findById(videoId)
    if(!video)
    {
        throw new ApiError(404,"no video found")
    }

    if(req.user?._id.toString()!=video.owner.toString())
    {
        throw new ApiError(404,"You are not allowed to edit this video")
    }

    try {
        const updatedVideo=await Video.findByIdAndUpdate
        (
            videoId,
            {
                $set:{
                    isPublished:!video.isPublished
                }
            },
            {
                new:true
            }
        )
        return res.status(200).json(new ApiResponse(200, updatedVideo, "Video publish status updated successfully"))
    } catch (error) {
        throw new ApiError(500, "Error while updating the publish status")
        
    }
    
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}