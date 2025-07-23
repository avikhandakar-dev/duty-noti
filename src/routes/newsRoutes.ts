import express from "express";
import { updateNews, getNewsBySymbol } from "../controllers/newsController";

const router = express.Router();

router.route("/update").post(updateNews);
router.route("/get/:symbol").get(getNewsBySymbol);

export { router as newsRoutes };
