import express from "express";
import {
  updateNews,
  getNewsBySymbol,
  updateRssNews,
  getRssNews,
} from "../controllers/newsController";

const router = express.Router();

router.route("/update").post(updateNews);
router.route("/get/:symbol").get(getNewsBySymbol);
router.route("/update-rss").post(updateRssNews);
router.route("/get-rss").get(getRssNews);

export { router as newsRoutes };
