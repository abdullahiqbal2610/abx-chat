const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String}, // Optional backup
    phoneNumber: { type: String, required: true, unique: true },
    about: { type: String, default: "Hey there! I am using WhatsApp." },
    avatar: { type: String, default: "" }, // URL to image
    firebaseUID: { type: String, required: true, unique: true }, // The Critical Link
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
