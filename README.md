
# 🚀 ABX-Chat
> **Secure. Fast. Minimal.**
> A full-stack, real-time messaging engine built from scratch.

![Banner](https://img.shields.io/badge/Status-Live-00D664?style=for-the-badge) ![Stack](https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge) ![Platform](https://img.shields.io/badge/Platform-iOS%20|%20Android-black?style=for-the-badge)

## 📖 Overview
**ABX-Chat** is not just a UI clone—it is a robust real-time communication engine. Built with **React Native (Expo)** and **Socket.io**, it handles live data synchronization, binary media streaming, and persistent state management without relying on third-party chat SDKs.

Designed with a **"Cyberpunk/Astro"** aesthetic, featuring deep OLED blacks, haptic feedback, and smooth layout animations.

---

## ✨ Key Features
* **⚡ Real-Time Messaging:** Instant delivery via WebSockets (Socket.io).
* **🟢 Live Status:** Real-time "Online" and "Offline" presence detection.
* **💬 Typing Indicators:** Live "User is typing..." animations.
* **✅ Read Receipts:** Double Blue Ticks when messages are viewed.
* **📸 Media Support:** Seamless image sharing (Base64 stream handling).
* **👤 Profile Management:** Custom Avatar uploads, editing, and removal.
* **🎨 Pro UI/UX:**
    * Dark Mode (Jet Black & Astro White)
    * Haptic Feedback on interactions
    * Glassmorphism & Linear Gradients
    * Custom SVG Iconography

---

## 🛠️ Tech Stack
| Component | Technology |
| :--- | :--- |
| **Frontend** | React Native (Expo), TypeScript, Reanimated |
| **Backend** | Node.js, Express.js |
| **Real-Time** | Socket.io (WebSockets) |
| **Database** | MongoDB (Mongoose) |
| **Media** | Expo Image Picker (Base64) |
| **Design** | React Native SVG, Linear Gradient |

---


## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/abdullahiqbal2610/abx-chat.git](https://github.com/abdullahiqbal2610/abx-chat.git)
cd abx-chat

```

### 2. Backend Setup

The backend runs on Node.js and connects to MongoDB.

```bash
cd server
npm install
# Start the server (Default Port: 5000)
node index.js

```

### 3. Frontend Setup

The frontend is built with Expo.

```bash
cd client
npm install
# Start the app
npx expo start

```

### 4. Configuration (Important!)

Since this is a physical device demo, you must connect the Frontend to your local IP.

1. Open `client/app/(tabs)/index.tsx`
2. Find `const YOUR_IP = "..."`
3. Replace it with your machine's local IP (Run `ipconfig` or `ifconfig` to find it).

---

## 📂 Project Structure

```
abx-chat/
├── client/             # React Native App
│   ├── app/            # Expo Router Pages
│   ├── components/     # Reusable UI Components
│   └── assets/         # Images & Fonts
├── server/             # Node.js Backend
│   ├── models/         # MongoDB Schemas (User, Message)
│   ├── routes/         # Auth & API Routes
│   └── index.js        # Socket.io Entry Point
└── README.md

```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**Abdullah Iqbal**

* **LinkedIn:** https://www.linkedin.com/in/muhammad-abdullah-iqbal-a42b5b301/
* **Portfolio:** http://abdullahiqbal2610.github.io/

---

> Built with ❤️ and code.

```

```
