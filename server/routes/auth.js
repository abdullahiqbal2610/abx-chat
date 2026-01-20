// server/routes/auth.js
const router = require("express").Router();
const admin = require("firebase-admin");
const User = require("../models/User");

// Initialize Firebase Admin (The Guard)
const serviceAccount = require("../firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

router.post("/login", async (req, res) => {
  const { token, phoneNumber, name } = req.body; // <--- NEW: Accept name

  try {
    let uid;
    // ... (Keep your Dev Bypass logic here) ...
    if (token === "TEST_TOKEN_FOR_DEV") {
      uid = "dev_user_" + phoneNumber;
    } else {
      // ... (Keep production logic) ...
      const decodedToken = await admin.auth().verifyIdToken(token);
      uid = decodedToken.uid;
    }

    let user = await User.findOne({ firebaseUID: uid });

    if (!user) {
      // Create NEW User
      user = new User({
        firebaseUID: uid,
        phoneNumber: phoneNumber,
        name: name || "New User", // <--- NEW: Use provided name
      });
      await user.save();
    } else if (name) {
      // Update EXISTING User's name if they provide a new one
      user.name = name;
      await user.save();
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (except me)
router.get("/users/:myPhonenumber", async (req, res) => {
  try {
    const users = await User.find({
      phoneNumber: { $ne: req.params.myPhonenumber },
    });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: Update Profile (Name & Avatar)
router.put("/update", async (req, res) => {
  const { phoneNumber, name, avatar } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { phoneNumber },
      { name, avatar },
      { new: true }, // Return the updated user data immediately
    );
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
