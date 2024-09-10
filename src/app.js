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


//routes import
import userRouter from './routes/user.routes.js';
import videoRouter from './routes/video.routes.js';
import commentRouter from './routes/comment.routes.js';
import likeRouter from './routes/like.routes.js';
import playlistRouter from './routes/playlist.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import healthcheckRouter from './routes/healthcheck.routes.js';


//routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/healthcheck",healthcheckRouter)


export { app };