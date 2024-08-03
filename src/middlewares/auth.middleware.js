    //get the token from the request header
    //check if the token is valid
    //if the token is valid, get the user from the database
    //attach the user to the request object
    //move to the next middleware
    //if the token is invalid, send an error response 

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from 'jsonwebtoken';
import { User } from "../models/user.model.js";

export const verifyJwtToken = asyncHandler(async (req, _,next) => {
    try {
        const token=req.cookies?.accessToken||req.header('Authorization')?.replace('Bearer ',''); 
        if(!token){
            throw new ApiError(401, 'Unauthorized request'); 
        }
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        const user=await User.findById(decodedToken._id).select('-password -refreshToken');
        if(!user){
            throw new ApiError(404, 'Invalid user');
        }
        req.user=user;
        next();
    } catch (error) {
        throw new ApiError(401, 'Unauthorized request');
        
    }
});
    