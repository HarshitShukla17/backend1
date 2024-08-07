import { Router } from "express";
import { changeCurentPassword, getCurrentUser, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { loginUser, logoutUser } from "../controllers/user.controller.js";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//why i can  use .none() here?
//because we are not expecting any file to be uploaded in the login route and passing the value as form data

//secured routes
router.route("/logout").post(verifyJwtToken, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);
router.route("/update-password").post(verifyJwtToken,changeCurentPassword);
router.route("/current-user").post(verifyJwtToken,getCurrentUser);
router.route("/update-account-details").post(verifyJwtToken,updateAccountDetails);
router.route("/update-avatar").patch(verifyJwtToken,upload.single('avatar'),updateUserAvatar);
router.route("/update-coverImage").post(verifyJwtToken,upload.single({name:"coverImage"}),updateUserCoverImage);

export default router;
