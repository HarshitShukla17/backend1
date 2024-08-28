import { Router } from "express";
import { addComment, deleteComment,  getVideoComments, updateComment } from "../controllers/comment.controller.js";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";

const commentRouter = Router();

commentRouter.use(verifyJwtToken);

commentRouter.route("/:videoId").get(getVideoComments).post(addComment);
commentRouter.route("/c/:commentId").patch(updateComment).delete(deleteComment);

export default commentRouter;

