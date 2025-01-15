import express from "express";
import { getAllUsers, getActiveUsers } from "../controllers/authController";

const router = express.Router();

router.route("/users/get").post(getAllUsers);
router.route("/users/active").post(getActiveUsers);

export { router as notiRoutes };
