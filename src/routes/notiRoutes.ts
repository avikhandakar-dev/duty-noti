import express from "express";
import {
  sendPushNotification,
  sendAnalysis,
} from "../controllers/notiController";

const router = express.Router();

router.route("/send/push").post(sendPushNotification);
router.route("/send/analysis").post(sendAnalysis);

export { router as notiRoutes };
