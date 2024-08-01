
import mongoose,{mongo, Schema} from "mongoose";
import { Video } from "./video.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,//hashed password
        required: [true, 'Password is required'],


    },
    fullName: {
        type: String,
        required: true,
        trim:true,
        index: true
    },
    avatar: {
        type: String,//here we use cloudinary image url
        required: true,

    },
    coverImage: {
        type: String,
        
    },
    refreshToken: {
        type: String,
       
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Video'
    }],
    
},{timestamps: true});

//using pre hook to hash password before saving
userSchema.pre('save', async function(next){
    if(this.isModified('password')){
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

//creating custom methods to compare password
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

//creating custom method to generate jwt token
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        email:this.email,
        username:this.fullName,

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY,
    }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY,
    }
    )
}


//jwt is a bearer token means if you have this token you can access the resources

export const User = mongoose.model('User', userSchema);