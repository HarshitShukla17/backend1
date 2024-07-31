import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance=await mongoose.connect(
            `${process.env.MONGO_URI}/${DB_NAME}`
        );
        console.log(`MONGODB connected: ${connectionInstance.connection.host}`);//host is the server
        console.log(connectionInstance)
    } catch (error) {
        console.error("MONGODB connection FAILED: ", error);
        process.exit(1);//exit with failure
    }
}

export default connectDB;