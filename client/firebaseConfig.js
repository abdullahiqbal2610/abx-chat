// client/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAfYKFZLQr4OMWRJIRK_Xu_DR1FkjB07xw",
  authDomain: "abdullah-s-whatsapp.firebaseapp.com",
  projectId: "abdullah-s-whatsapp",
  storageBucket: "abdullah-s-whatsapp.firebasestorage.app",
  messagingSenderId: "112051174510",
  appId: "1:112051174510:web:ed2a3181197e5f54e47a7f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);