import express from "express";
import { getAllUsers, getActiveUsers } from "../controllers/authController";

const router = express.Router();

router.route("/users/get").get(getAllUsers);
router.route("/users/active").get(getActiveUsers);

export { router as authRoutes };
