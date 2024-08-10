import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary,deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //check if given field value is given and validate the values
  //check whether user already exist or not:username,email
  //check for images check for avatar
  //upload them to cloudinary,avatar
  //create user object
  //create db
  //remove password and refresh token field from response
  //check for user creation
  //return res

  const { fullName, username, email, password } = req.body;

  // if([fullName, username, email, password].some((field) => field?.trim() === '')){
  //     throw new ApiError(400, 'Please provide all the required fields');
  // }

  if (!fullName || !username || !email || !password) {
    throw new ApiError(400, "Please provide all the required fields");
  }

  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please provide all the required fields");
  }

  const userExists = await User.exists({ $or: [{ username }, { email }] });

  if (userExists) {
    throw new ApiError(409, "User already exists");
  }
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Please provide an avatar");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, "User created successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  //get the email password username from frontend
  //check for the validation of the field
  //check for the user exist or not
  //check for the password
  //generate the access token
  //return the access token and refresh token in response as a secure cookie
  //send the response

  const { email, password, username } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Please provide email or username");
  }

  if (!password) {
    throw new ApiError(400, "Please provide password");
  }

  if ([email || username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Please provide all the required fields");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedINUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!loggedINUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedINUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //clear the cookie
  //send the response
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //get the refresh token from the cookie
  //check for the refresh token
  //generate the access token
  //send the response
  const incomingRefreshToken = req.cookies?.refreshToken||req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unauthorized request");
  }
  
  //the user token and the saved one is different so need to verify it
  const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findById( decodedToken._id );
  if (!user) {
    throw new ApiError(404, "Invalid refresh token");
  }
  if (user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401,"request token is expired or used");
  }


 // yaha change kr sakta hoon like if my refresh token is matched and not expired then there is no need to generate new refresh token we 
 //can use the old one and generate new access token only

 
  const { accessToken,newRefreshToken } = await generateAccessAndRefreshToken(user._id);

  const options = {
    httpOnly: true,
    secure: true,
  };


  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(new ApiResponse(200, { accessToken,newRefreshToken }, "Access token refreshed successfully"));
});

const changeCurentPassword=asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword}=req.body
  if(!oldPassword||!newPassword)
  {
    throw new ApiError(401,"all fields are required")
  }
  const user=await User.findById(req.user?._id)
  const isMatch=user.isPasswordCorrect(oldPassword)
  if(!isMatch){
    throw new ApiError(401,"Invalid oldPassword")
  }
  
  
   user.password=newPassword
   await user.save({validateBeforeSave:false})

   return res
   .status(200)
   .json(new ApiResponse(200,{},"password updated successfully"))
  
})

const getCurrentUser=asyncHandler(async(req,res)=>{
  
  return res
  .status(200)
  .json(new ApiResponse(200,req.user,"currentUser fetched successfully"))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {fullName,username,email}=req.body
  if(!fullName||!email||!username){
    throw new ApiError(401,"all fields are required")
  }
  // const user=req.user
  // user.fullName=fullName
  // user.username=username
  // user.email=email
  // await user.save({validateBeforeSave:false})
  // const updatedUser=await User.findById(req.user._id).select("-password -refreshToken")

  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName:fullName,
        username:username,
        email:email
      }
    },
    {new:true}
  ).select("-password -refreshToken")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Current user updated successfully"))

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
  
  if(!req.file){
    throw new ApiError(401,"Please provide an avatar")
  }
  const avatarLocalPath=req.file?.path
  if(!avatarLocalPath)
  {
    throw new ApiError(400,"avatar file is missing")
  }
  const oldAvatar=req.user.avatar
  const avatar=await uploadOnCloudinary(avatarLocalPath)
  

  if(!avatar.url)
  {
    throw new ApiError(500,"Error while uploading the avatar")
  }
  const user=await User.findByIdAndUpdate(
    req.user._id,
    {$set:{
      avatar:avatar.url
    }},
    {new:true}
  ).select("-password -refreshToken")

  if(oldAvatar){
    console.log(oldAvatar,"old avatar")
    const result=await deleteOnCloudinary(oldAvatar)
    console.log(result,"old avatar deleted successfully")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,user,"avatar updated successfully"))
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
  if(!req.file){
    throw new ApiError(401,"Please provide an avatar")
  }
  const coverImageLocalPath=req.file?.path
  if(!coverImageLocalPath)
  {
    throw new ApiError(400,"coverImage file is missing")
  }

  const coverImage=await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage.url)
  {
    throw new ApiError(500,"Error while uploading the coverImage")
  }
  const user=await User.findByIdAndUpdate(
    req.user._id,
    {$set:{
      coverImage:coverImage.url
    }},
    {new:true}
  ).select("-password -refreshToken")

  return res
  .status(200)
  .json(200,user,"Cover Image updated successfully")
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{

    const {username}=req.params
    if(!username?.trim()){
      throw new ApiError(401,"username is missing")
    }

    const channel=await User.aggregate([
      {$match:{username:username?.toLowerCase()}},
      {$lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }},
      {$lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }},
      {$addFields:{
        subscriberCount:{$size:"$subscribers"},
        subscribedToCount:{$size:"$subscribedTo"},
        isSubscribed:{
          $cond:{
            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
      }},
      {$project:{
        fullName:1,
        username:1,
        subscriberCount:1,
        subscribedToCount:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1,
        email:1

      }}
      
    ])
    
    console.log(channel)

    if(!channel?.length)
    {
      throw new ApiError(404,"channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"channel fetched successfully"))
})

const getWatchHistory=asyncHandler(async(req,res)=>{
  
  const user=await User.aggregate([
    {$match:{
      _id:new mongoose.Types.ObjectId(req.user._id)
    }},
    {$lookup:{
      from:"videos",
      localField:"watchHistory",
      foreignField:"_id",
      as:"watchHistory",
      pipeline:[
        {$lookup:{
          from:"users",
          localField:"owner",
          foreignField:"_id",
          as:"owner",
          pipeline:[
            {$project:{
              fullName:1,
              username:1,
              avatar:1
            }}
          ]
        }},
        {$addFields:{
          owner:{
            $first:"$owner"
          }
        }}
      ]
    }}
  ])

  if(!user?.length)
  {
    throw new ApiError(404,"watch history not found")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,user[0].watchHistory,"user watchHistory fetched successfully"))

  
})



export { 
  registerUser, 
  loginUser, 
  logoutUser, 
  refreshAccessToken,
  changeCurentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};

// const user= new User({
//     fullName,
//     username: username.toLowerCase(),
//     email,
//     password,
//     avatar: avatar.url,
//     coverImage: coverImage?.url||""
// });
// await user.save();
// user.password = undefined;
// user.refreshToken = undefined;
// res.status(201).json({
//     success: true,
//     message: 'User created successfully',
//     data: user
// });
