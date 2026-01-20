const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },
    sender: { type: String, required: true },
    text: { type: String }, // Can be empty if sending just an image
    image: { type: String }, // <--- NEW: Stores the Base64 Image string
    type: { type: String, default: "text" }, // "text" or "image"
    status: { type: String, default: "sent" }, // "sent", "delivered", "read"
    time: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
