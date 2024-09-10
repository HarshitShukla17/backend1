import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if([name,description].some((field)=>field.trim()===""))
    {
        throw new ApiError(400,"name and description are required for playlist")
    }
    const user=req.user?._id
    const playlist=await Playlist.create({
        name,
        description,
        owner:user
    })
    if(!playlist){
        throw new ApiError(500,"failed to create playlist")
    }
    playlist=await Playlist.findById(playlist._id)
    if(!playlist){
        throw new ApiError(404,"playist not found")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"playlist created Successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId))
    {
        throw new ApiError(400,"Invalid userId")
    }
    const getPlaylist=await Playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        }
    ])
    if(!getPlaylist?.length)
    {
        throw new ApiError(404,"playlist not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,getPlaylist,"playlist fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!isValidObjectId(playlistId))
    {
        throw new ApiError(400,"Invalid playlistId")
    }

    const getPlaylist=await Playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"playlistOwner",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
            
        },
        {
            $addFields:{
                owner:{
                    $first:"$playlistOwner"
                }
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        fullName:1,
                                        avatar:1
                                    }
                                }
                            ]

                        }
                    },
                    {
                        $addFields:{
                            owner:{

                                $first:"$owner"
                            }
                        }
                    }
                ]

            }
        }
    ])
    if(!getPlaylist?.length)
    {
        throw new ApiError(404,"no playlist found")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,getPlaylist,"playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId)||!isValidObjectId(videoId))
    {
        throw new ApiError(400,"please provide valid id's of playlist and and videos")
    }

    const playlist=await Playlist.findById(playlistId)
    if(!playlist)throw new ApiError(404,"playlist does not exist for given id")

    if(req.user?._id.toString()!=playlist.owner.toString())throw new ApiError(400,"not eligible to add video to playlist")
    
    const video=await Video.findById(videoId)
    if(!video)
    {
        throw new ApiError(404,"video does not exist for given id")
    }
    const isMatch=playlist.videos.find((video)=>video.equals(videoId))
    if(isMatch)
    {
        throw new ApiError(400,"video already exists")
    }
    try {
        // $addToSet can also be used
        playlist.videos.push(video);
        const updatedPlaylist = await playlist.save();

        return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"))
    } catch (error) {
        throw new ApiError(500, "Unable to add video to the playlist")
    }
    
    
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    
    if(!isValidObjectId(playlistId)||!isValidObjectId(videoId))
    {
        throw new ApiError(400,"please provide valid id's of playlist and and videos")
    }

    const playlist=await Playlist.findById(playlistId)
    if(!playlist)throw new ApiError(404,"playlist does not exist for given id")

    if(req.user?._id.toString()!=playlist.owner.toString())throw new ApiError(400,"not eligible to delete video to playlist")
    
    const video=await Video.findById(videoId)
    if(!video)
    {
        throw new ApiError(404,"video does not exist for given id")
    }
    try {
        
        playlist.videos.pull(video._id);
        const updatedPlaylist = await playlist.save();

        return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video deleted to playlist successfully"))
    } catch (error) {
        throw new ApiError(500, "Unable to delete video to the playlist")
    }


})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "This playlist does not exist")
    }

    if (playlist.owner.toString() != req.user?._id.toString()) {
        throw new ApiError(400, "You are not the owner of this playlist")
    }

    try {
        await Playlist.findByIdAndDelete(playlistId)

        return res
            .status(200)
            .json(new ApiResponse(200, "Playlist deleted successfully"))
    } catch (error) {
        throw new ApiError(500, "Unable to delete playlist")
    }
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    if (!name || name.trim() === "" || !description || description.trim() === "") {
        throw new ApiError(400, "All fields are required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "This playlist does not exist")
    }

    if (playlist.owner.toString() != (req.user._id).toString()) {
        throw new ApiError(400, "You are not the owner to update this playlist")
    }

    try {
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $set: {
                    name,
                    description
                }
            }, { new: true }
        )

        return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
    } catch (error) {
        throw new ApiError(500, "Unable to update playlist")
    }
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}