//require("dotenv").config({path: './env'}); it is ok but we can use es6 import to maintain our code consistancy..

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ 
    path: "./.env" 
});
//we can use this as our experimental feature


connectDB()
.then(() => {
    app.on("error", (error) => {
        console.error("ERROR: ", error);
    });
    app.listen(process.env.PORT, () => {
        console.log(`App is listening on port 
            ${process.env.PORT}`);}); 
}).catch((error) => {
    console.error("MongoDB connection failed !!!  ", error);  
});
 














// import express from "express";
// const app = express();

// ;(async ()=>{
//     try {
//         await mongoose.connect(`${process.env.
//             MONGODB_URI}/${DB_NAME}`);
        
//         app.on("error", (error) => {
//             console.error("ERROR: ", error);
//             throw error;
//         });

//         app.listen(process.env.PORT||8000, () => {
//             console.log(`App is listening on port 
//                 ${process.env.PORT||8000}`);
//         });

        
//     } catch (error) {
//         console.error("ERROR: ", error);
//         throw error;
        
//     }
// })()