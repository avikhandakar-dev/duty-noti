import express from "express";
import "express-async-errors";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import helmet from "helmet";
import fileUpload from "express-fileupload";
// middleware
import notFoundMiddleware from "./middleware/notFound";
import errorHandlerMiddleware from "./middleware/errorHandler";
import { createServer } from "http";
import { Server } from "socket.io";
import { workers } from "./job/worker";
import { notiRoutes } from "./routes/notiRoutes";
import { handleSocketEvents } from "./lib/socket";
import { getAllUsers } from "./controllers/authController";
import { authRoutes } from "./routes/authRoutes";
import { updateRoutes } from "./routes/updateRoutes";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
handleSocketEvents(io);

app.use(helmet());

// app.set("trust proxy", true);
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["set-cookie", "x-access-token"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(
  fileUpload({
    createParentPath: true,
  })
);
app.use("/noti", notiRoutes);
app.use("/auth", authRoutes);
app.use("/update", updateRoutes);
app.use(errorHandlerMiddleware);
app.use(notFoundMiddleware);

const port = process.env.PORT || 1339;
const start = async () => {
  try {
    httpServer.listen(port, () => {
      console.log(`Server is listening on port ${port}...`);
    });
    workers.init();
  } catch (error) {
    console.log(error);
  }
};

start();
export { io };
