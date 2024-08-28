import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    // 1. Get the videoId from the request params
    // 2. Get the page and limit query parameters
    // 3. Validate the videoId, page, and limit
    // 4. Query the database for comments for the video
    // 5. Paginate the results
    // 6. Return the paginated comments

    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    const pageNum=Number(page)
    const limitNum=Number(limit)


    if (!videoId || !pageNum || !limitNum || pageNum === 0) {
        throw new ApiError(400, "Please provide a valid input")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }

    const getComments=await Comment.aggregate([
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }
        },
        

        {$lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"owner",
            pipeline:[
                {
                    $project:{
                        avatar:1,
                        username:1,
                        email:1
                    }
                }
            ],
        }},
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes",
            }
        },
        {
            $addFields:{
                likedByUser:{
                    $in: [req.user?._id, "$totalLikesOnComment.likedBy"]
                }
            }
        },
        {
            $group:{
                _id:"$_id",
                content:{$first:"$content"},
                video:{$first:"$video"},
                owner:{$first:"$owner"},
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                totalLikesOnthisComment:{$sum:{ $size: "$likes"}},
                likedByUser:{$first:"$likedByUser"}
            }
        },
        {
            $addFields:{
                owner:{$arrayElemAt:["$owner",0]},
                isOwner:{
                    $cond:{
                        if:{$eq:["$owner._id",req.user?._id]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {$skip:(pageNum-1)*limitNum},
        {$limit:limitNum},
        {$sort:{createdAt:-1}}
        

    ])

    if(!getComments?.length){
        throw new ApiError(404,"No comments found")
    }

    return res.status(200).json(new ApiResponse(200, getComments,"Comments fetched successfully"))
        


})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    // 1. Get the videoId from the request params
    // 2. Get the content of the comment from the request body
    // 3. Validate the videoId and content
    // 4. Create the comment
    // 5. Return the comment

    const {videoId} = req.params
    const {content} = req.body

    if(!videoId || !content){
        throw new ApiError(400,"please provide the required fields")
    }
    if([content,videoId].some((field)=>field.trim()===""))
        {
            throw new ApiError(400,"all content and video should not be empty")
        }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }

    const newComment=await Comment.create({
        content,
        video:videoId,
        owner:req.user._id
    })
     
    const postedComment=await Comment.findById(newComment._id)

    if(!postedComment){
        throw new ApiError(500,"Comment not created")
    }

    return res.status(201).json(new ApiResponse(201,postedComment,"Comment created successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    // 1. Get the commentId from the request params
    // 2. Get the updated content from the request body
    // 3. Validate the commentId and content
    // 4. Find the comment by id
    // 5. Check if the user is the owner of the comment
    // 6. Update the comment
    // 7. Return the updated comment

    const {commentId} = req.params
    const {content} = req.body
    
    if(!commentId || !content){
        throw new ApiError(400,"please provide the required fields")
    }
    if([content,commentId].some((field)=>field.trim()===""))
        {
            throw new ApiError(400,"all content and comment should not be empty")
        }
    
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid comment id")
    }

    const comment=await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404,"Comment not found")
    }

    if(comment.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403,"You are not the owner of this comment")
    }

    try {
        const updatedComment=await Comment.findByIdAndUpdate(
            commentId,
            {
                $set:{
                    content:content
                }
            },
            {
                new:true
            }
        )
    
        return res.status(200).json(new ApiResponse(200,updatedComment,"Comment updated successfully"))
    } catch (error) {
        throw new ApiError(500,"Comment not updated")
        
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    // 1. Get the commentId from the request params
    // 2. Validate the commentId
    // 3. Find the comment by id
    // 4. Check if the user is the owner of the comment
    // 5. Delete the likes associated with the comment
    // 6. Delete the comment

    const {commentId}=req.params
    if(!isValidObjectId(commentId))
    {
        throw new ApiError(400,"Invalid CommentId")
    }

    const comment=await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404,"Comment not found")
    }

    

    const video=await Video.findById(comment.video)
    const videoOwner=await User.findById(video.owner)

    if(req.user._id.toString()!=comment.owner.toString()&&req.user._id.toString()!=videoOwner._id.toString())
    {
        throw new ApiError(403,"you are not the owner of this")
    }

    const startSession=await mongoose.startSession()
    startSession.startTransaction()

    try {
        await Like.deleteMany({comment:commentId})
        await Comment.findByIdAndDelete(commentId)
        await startSession.commitTransaction()
        return res.status(200).json(new ApiResponse(200,{}, "Comment deleted successfully"))
    } catch (error) {
        await startSession.abortTransaction()
        throw new ApiError(500,"Comment not deleted")
    }



})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }