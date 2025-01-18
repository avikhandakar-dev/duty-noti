import express from "express";
import {
  sendPushNotification,
  sendAnalysis,
  addComment,
  giveReaction,
  getComments,
} from "../controllers/notiController";

const router = express.Router();

router.route("/send/push").post(sendPushNotification);
router.route("/send/analysis").post(sendAnalysis);
router.route("/add/comment").post(addComment);
router.route("/give/reaction").post(giveReaction);
router.route("/get/comments/:analysisId").get(getComments);

export { router as notiRoutes };
