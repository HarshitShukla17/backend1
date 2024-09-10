import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  const owner = req.user?._id;

  if (!content || content.trim() === "") {
    throw new ApiError(400, "content is required");
  }
  const tweet = await Tweet.create({
    content,
    owner,
  });
  if (!tweet) {
    throw new ApiError(500, "failed to tweet");
  }

  const uploadedTweet = await Tweet.findById(tweet._id);
  if (!uploadedTweet) {
    throw new ApiError(404, "tweet not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, uploadedTweet, "tweet uploaded successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const userId = req.user?._id;
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "tweetLikedBy",
      },
    },
    {
      $group: {
        _id: "$_id",
        content: { $first: "$content" },
        owner: { $first: "$owner" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        totalTweetLikes: { $sum: { $size: "$tweetLikedBy" } },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  if (!tweets?.length) {
    throw new ApiError(404, "Tweets does not exist");
  }

  

  const tweetedBy = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $addFields: {
        isTweetOwner: {
          $cond: {
            if: { $eq: [req.user?._id.toString(), userId] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        avatar: 1,
        createdAt: 1,
        updatedAt: 1,
        isTweetOwner: 1,
      },
    },
  ]);

  const tweetAndDetails = {
    tweets,
    tweetedBy,
  };
  return res
  .status(200)
  .json(new ApiResponse(200, tweetAndDetails, "tweets fetched successfully"))
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!content || content.trim() === "") {
    throw new ApiError(400, "content is required");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "tweetId is invalid");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "no tweet found");
  }
  if (req.user?._id.toString() != tweet.owner.toString()) {
    throw new ApiError(400, "you are not eligible to update tweet");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: content,
      },
    },
    {
      new: true,
    }
  );
  if (!updatedTweet) {
    throw new ApiError(500, "failed to update the tweet");
  }

  return res.status(200).json(200, updatedTweet, "tweet updated successfully");
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet

  const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "this tweet does not exist")
    }

    if (tweet.owner.toString() != req.user?._id.toString()) {
        throw new ApiError(400, "You are not the owner of this tweet to delete")
    }

    try {
        await Tweet.findByIdAndDelete(tweetId)
        // delete likes of deleted tweet
        await Like.deleteMany({ tweet: tweet._id });

        return res
            .status(200)
            .json(new ApiResponse(200, "tweet deleted successfully"))
    } catch (error) {
        throw new ApiError(500, "Unable to delete tweet")
    }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
