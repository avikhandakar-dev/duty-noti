import express from "express";
import { financeChatStream } from "../controllers/chat/finance";

const router = express.Router();

router.route("/finance/stream").post(financeChatStream);

export { router as chatRoutes };
