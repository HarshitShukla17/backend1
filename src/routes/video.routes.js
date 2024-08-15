import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";
import { publishAVideo,updateVideo,getVideoById,getAllVideos,deleteVideo} from "../controllers/video.controller.js";

//here routes are defined for video controller
//routes are defined for publish video, update video, get video by id, get all videos, delete video
//routes are protected by jwt token

const router = Router();

router.route("/publish-video").post(
    verifyJwtToken,
    upload.fields([{
        name: "videoFile",
        maxCount: 1
    }, {
        name: "thumbnail",
        maxCount: 1
    }]),
    publishAVideo
)
router.route('/update-video/:videoId').patch(verifyJwtToken,upload.single('thumbnail'),updateVideo);
router.route('/get-video/:videoId').get(verifyJwtToken,getVideoById);
router.route('/get-all-videos').get(verifyJwtToken,getAllVideos);
router.route('/delete-video/:videoId').delete(verifyJwtToken,deleteVideo);

export default router;