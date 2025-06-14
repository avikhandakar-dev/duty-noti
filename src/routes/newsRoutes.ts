import express from "express";
import { updateNews } from "../controllers/newsController";

const router = express.Router();

router.route("/update").post(updateNews);

export { router as newsRoutes };
