//1. we take the local path of the file 
//2. we upload the file to cloudinary
//3. if the file is uploaded successfully we will delete the file from the local storage
//4. we return the cloudinary url of the uploaded file

//here we will use the cloudinary and fs modules

import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

//configuring the cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//function to upload the file to cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        //uploading the file to cloudinary
        const result = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto",
        });
        console.log("File uploaded successfully on cloudinary", result.url);
        return result;

    } catch (error) {
        fs.unlinkSync(localFilePath);//removing the file from local storage
        return null;
    }
}

export {uploadOnCloudinary};
