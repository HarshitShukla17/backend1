import {asyncHandler} from '../utils/asyncHandler.js';
import {User} from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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


    const {fullName, username, email, password} = req.body;
    
    if([fullName, username, email, password].some((field) => field?.trim() === '')){
        throw new ApiError(400, 'Please provide all the required fields');
    }

    const userExists = await User.exists({$or: [{username}, {email}]});
    console.log(userExists);
    if(userExists){
        throw new ApiError(409, 'User already exists');
    }
    const avatarLocalPath=req.files?.avatar?.[0]?.path;
    console.log(req.files);

    const coverImageLocalPath=req.files?.coverImage?.[0]?.path;
    
    if(!avatarLocalPath){
        throw new ApiError(400, 'Please provide an avatar');
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar){
        throw new ApiError(500, 'Failed to upload avatar');
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    const user=User.create({
        fullName,
        username: username.toLowerCase(),  
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url||""
    });
    const createdUser=await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500, 'Something went wrong while creating user');
    }
    
    return res.status(201).json(new ApiResponse(200, 'User created successfully', createdUser));
    
 
});

export {registerUser};

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
    