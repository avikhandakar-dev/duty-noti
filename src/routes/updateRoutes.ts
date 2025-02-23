import express from "express";
import {
  indexTvJp,
  presetTvJp,
  sectorTvJp,
  allStocksTvJp,
  amarstockAllMarket,
  dsebdIndex,
  bdCategory,
} from "../controllers/updateController";

const router = express.Router();

router.route("/index-tv-jp").post(indexTvJp);
router.route("/preset-tv-jp").post(presetTvJp);
router.route("/sector-tv-jp").post(sectorTvJp);
router.route("/all-stocks-tv-jp").post(allStocksTvJp);
router.route("/amarstock-all-market").post(amarstockAllMarket);
router.route("/dsebd-index").post(dsebdIndex);
router.route("/bd-category").post(bdCategory);

export { router as updateRoutes };
