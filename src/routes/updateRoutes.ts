import express from "express";
import {
  indexTvJp,
  presetTvJp,
  sectorTvJp,
  allStocksTvJp,
} from "../controllers/updateController";

const router = express.Router();

router.route("/index-tv-jp").post(indexTvJp);
router.route("/preset-tv-jp").post(presetTvJp);
router.route("/sector-tv-jp").post(sectorTvJp);
router.route("/all-stocks-tv-jp").post(allStocksTvJp);

export { router as updateRoutes };
