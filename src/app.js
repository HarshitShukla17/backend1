import express, { urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

//these npm packages are used to handle the request and response

const app =express();

//app.use() is always used to configure the middleware used by the application

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit: "16kb"}));//this is used to parse the incoming request with JSON payloads
app.use(express.urlencoded({extended: true,limit:"16kb"}));//this is used to parse the incoming request with urlencoded payloads
app.use(express.static("public"));//this is used to store files like images, css, js etc
app.use(cookieParser());//this is used to parse the incoming cookies

export { app };