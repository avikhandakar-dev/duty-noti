import express from "express";
import {
  sendPushNotification,
  sendAnalysis,
  addComment,
  giveReaction,
  getComments,
  sendPushNotificationToTrialUser,
  sendPushNotificationToFreeUser,
  giveReactionToComment,
} from "../controllers/notiController";

const router = express.Router();

router.route("/send/push").post(sendPushNotification);
router.route("/send/analysis").post(sendAnalysis);
router.route("/add/comment").post(addComment);
router.route("/give/reaction").post(giveReaction);
router.route("/give/reaction-to-comment").post(giveReactionToComment);
router.route("/get/comments/:analysisId").get(getComments);
router.route("/send/push-to-trial-user").post(sendPushNotificationToTrialUser);
router.route("/send/push-to-free-user").post(sendPushNotificationToFreeUser);

export { router as notiRoutes };
