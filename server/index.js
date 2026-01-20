const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http"); // New import
const { Server } = require("socket.io"); // New import
require("dotenv").config();
const Message = require("./models/Message");

const authRoute = require("./routes/auth");

const app = express();
const server = http.createServer(app); // Wrap express in HTTP server

// Setup Socket.io (The Real-Time Engine)
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connection from anywhere (Mobile App)
  },
});
// Increase limit to allow image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.log("❌ DB Error:", err));

app.use("/api/auth", authRoute);

app.get("/", (req, res) => {
  res.send("WhatsApp Clone Backend is Running!");
});

// --- SOCKET.IO LOGIC STARTS HERE ---
// This runs every time a user opens the app
io.on("connection", (socket) => {
  console.log("⚡ A User Connected:", socket.id);

  // 1. When User Joins -> Send them old history
  socket.on("join_room", async (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    socket.on("mark_read", async (data) => {
      const { roomId, userPhoneNumber } = data;

      // Update MongoDB: Set all messages in this room (NOT sent by me) to 'read'
      // This query says: "Find messages in this room, sent by the OTHER person, and mark read"
      await Message.updateMany(
        {
          roomId: roomId,
          sender: { $ne: userPhoneNumber },
          status: { $ne: "read" },
        },
        { $set: { status: "read" } },
      );

      // Tell the OTHER person: "Hey, I read your messages!"
      socket.to(roomId).emit("messages_read", { roomId });
    });

    // Fetch last 50 messages from MongoDB
    try {
      const history = await Message.find({ roomId: roomId })
        .sort({ createdAt: 1 })
        .limit(50);
      // Send history ONLY to the person who just joined
      socket.emit("load_history", history);
    } catch (err) {
      console.log("Error loading history:", err);
    }
  });

  // 1. TYPING EVENTS
  socket.on("typing", (data) => {
    // Broadcast to the specific room (except the sender)
    socket.to(data.roomId).emit("display_typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.roomId).emit("hide_typing", data);
  });

  // 2. ONLINE STATUS (Simple Version)
  // Store connected users in memory (Map: userId -> socketId)
  // For a portfolio, we just broadcast "User X is online" when they join a room
  socket.on("user_online", (phoneNumber) => {
    socket.broadcast.emit("update_user_status", {
      phoneNumber,
      status: "Online",
    });
  });
  // 2. When User Sends -> Save to DB + Broadcast
  socket.on("send_message", async (data) => {
    // Save to MongoDB
    try {
      const newMessage = new Message(data);
      await newMessage.save();
      console.log("💾 Message Saved to DB");
    } catch (err) {
      console.log("Save Error:", err);
    }

    // Send to everyone else
    socket.to(data.roomId).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});
// -----------------------------------

const PORT = process.env.PORT || 5000;
// Note: We listen on 'server', not 'app' now!
server.listen(PORT, () => {
  console.log(`🚀 Server (with Sockets) running on Port ${PORT}`);
});
