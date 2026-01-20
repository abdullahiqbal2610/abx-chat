const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ DB Connected. Creating Test User...");
    
    // Create a Fake User
    try {
      const newUser = new User({
        name: "Abdullah Test",
        phoneNumber: "+923001234567",
        firebaseUID: "test_uid_12345", // We fake this for now
        about: "I am a test user created from code."
      });

      await newUser.save();
      console.log("🎉 SUCCESS: User saved to MongoDB!");
    } catch (err) {
      console.log("❌ ERROR:", err.message);
    }
    process.exit();
  })
  .catch(err => console.log("DB Connection Error:", err));