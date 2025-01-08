import { Server, Socket } from "socket.io";

const handleSocketEvents = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("A user connected");

    socket.on("join", (userId: string) => {
      console.log("User joined:", userId, socket.id);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

export { handleSocketEvents };
