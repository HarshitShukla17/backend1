//require("dotenv").config({path: './env'}); it is ok but we can use es6 import to maintain our code consistancy..

import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({ 
    path: "./env" 
});
//we can use this as our experimental feature


connectDB();
 














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