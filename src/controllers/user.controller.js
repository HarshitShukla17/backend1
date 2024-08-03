import {asyncHandler} from '../utils/asyncHandler.js';
import {User} from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false});

        return {accessToken,refreshToken};
        
    } catch (error) {
        throw new ApiError(500, 'Failed to generate tokens');
        
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


    const {fullName, username, email, password} = req.body;
   
    
    
    // if([fullName, username, email, password].some((field) => field?.trim() === '')){
    //     throw new ApiError(400, 'Please provide all the required fields');
    // }

    if(!fullName || !username || !email || !password){
        throw new ApiError(400, 'Please provide all the required fields');
    }
     
    if([fullName, username, email, password].some((field) => field?.trim() === '')){
             throw new ApiError(400, 'Please provide all the required fields');   
    }


    const userExists = await User.exists({$or: [{username}, {email}]});
    
    if(userExists){
        throw new ApiError(409, 'User already exists');
    }
    const avatarLocalPath=req.files?.avatar?.[0]?.path;
    

    let coverImageLocalPath;

    if(req.files&& Array.isArray(req.files.coverImage&&req.files.coverImage.length>0)){
        coverImageLocalPath=req.files.coverImage[0].path;
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400, 'Please provide an avatar');
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar){
        throw new ApiError(500, 'Failed to upload avatar');
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    const user=await User.create({
        fullName,
        username: username.toLowerCase(),  
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url||""
    });
    const createdUser=await User.findById(user?._id).select('-password -refreshToken');
    if(!createdUser){
        throw new ApiError(500, 'Something went wrong while creating user');
    }
    
    return res.status(201).json(new ApiResponse(200, 'User created successfully', createdUser));
    
 
});


const loginUser = asyncHandler(async (req, res) => {
    //get the email password username from frontend
    //check for the validation of the field
    //check for the user exist or not
    //check for the password
    //generate the access token 
    //return the access token and refresh token in response as a secure cookie
    //send the response
    

    const {email,password,username}=req.body;
    if(!email&&!username)
    {
        throw new ApiError(400,"Pleasea provide email or username")

    }

    if(!password){
        throw new ApiError(400,"Please provide password")
    }

    if([email||username,password].some((field)=>field?.trim()==='')){
        throw new ApiError(400,"Please provide all the required fields")
    }

    const user=await User.findOne({$or:[{email},{username}]});
    if(!user){
        throw new ApiError(404,"User not found")
    }

    const isMatch=await user.isPasswordCorrect(password);
    if(!isMatch)
    {
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id); 

    const loggedINUser=await User.findById(user._id).select('-password -refreshToken');
    if(!loggedINUser){
        throw new ApiError(500,"Something went wrong while creating user")
    }

    const options={
        httpOnly:true,
        secure:true, 
    };

    return res
    .status(200)
    .cookie('refreshToken',refreshToken,options)
    .cookie('accessToken',accessToken,options)
    .json(
        new ApiResponse(200,
            {
                user:loggedINUser,accessToken,refreshToken
        
            },
            'User logged in successfully'
        ));

});

const logoutUser = asyncHandler(async (req, res) => {
    //clear the cookie
    //send the response
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken:undefined}
        },
        {new:true}
    );
    const options={
        httpOnly:true,
        secure:true,
        
    };
    return res
    .status(200)
    .clearCookie('refreshToken',options)
    .clearCookie('accessToken',options)
    .json(new ApiResponse(200,'User logged out successfully')); 
});
    



export {registerUser,loginUser,logoutUser};

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
    