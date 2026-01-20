import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Image,
  Animated,
} from "react-native";
import { io } from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path, G } from "react-native-svg";

// --- CONFIGURATION ---
const YOUR_IP = "192.168.1.6";
const SOCKET_URL = `http://${YOUR_IP}:5000`;
const API_URL = `http://${YOUR_IP}:5000/api/auth`;

const socket = io(SOCKET_URL);

export default function App() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [chatPartner, setChatPartner] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("+92300");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState("Offline");

  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    socket.on("receive_message", (data) => {
      setChatHistory((prev) => [...prev, data]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (chatPartner) {
        const activeRoom = [user.phoneNumber, chatPartner.phoneNumber]
          .sort()
          .join("_");
        if (data.roomId === activeRoom) {
          socket.emit("mark_read", {
            roomId: activeRoom,
            userPhoneNumber: user.phoneNumber,
          });
        }
      }
    });

    socket.on("load_history", (history) => setChatHistory(history));
    socket.on("messages_read", () =>
      setChatHistory((prev) => prev.map((msg) => ({ ...msg, status: "read" }))),
    );
    socket.on("display_typing", () => setIsTyping(true));
    socket.on("hide_typing", () => setIsTyping(false));
    socket.on("update_user_status", (data) => {
      if (chatPartner && data.phoneNumber === chatPartner.phoneNumber) {
        setPartnerStatus(data.status);
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("load_history");
      socket.off("messages_read");
      socket.off("display_typing");
      socket.off("hide_typing");
      socket.off("update_user_status");
    };
  }, [chatPartner, user]);

  // --- ACTIONS ---
  const handleLogin = async () => {
    if (!name.trim())
      return Alert.alert("Missing Name", "Please enter your name.");
    setLoading(true);
    Haptics.selectionAsync();
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "TEST_TOKEN_FOR_DEV",
          phoneNumber,
          name,
        }),
      });
      const userData = await res.json();
      if (res.ok) {
        setUser(userData);
        fetchContacts(userData.phoneNumber);
      } else {
        Alert.alert("Login Failed", userData.error);
      }
    } catch (error) {
      Alert.alert("Error", "Check IP");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: user.phoneNumber,
          name: user.name,
          avatar: user.avatar,
        }),
      });
      const updatedUser = await res.json();
      setUser(updatedUser);
      Alert.alert("Success", "Profile Updated!");
      setShowProfile(false);
    } catch (err) {
      Alert.alert("Error", "Could not update");
    }
  };

  const fetchContacts = async (myNumber) => {
    try {
      const res = await fetch(`${API_URL}/users/${myNumber}`);
      const users = await res.json();
      setAllUsers(users);
    } catch (err) {
      console.log(err);
    }
  };

  const startChat = (partner) => {
    Haptics.selectionAsync();
    setChatPartner(partner);
    setChatHistory([]);
    setIsTyping(false);
    setPartnerStatus("Online");
    const roomId = [user.phoneNumber, partner.phoneNumber].sort().join("_");
    socket.emit("join_room", roomId);
    socket.emit("mark_read", { roomId, userPhoneNumber: user.phoneNumber });
    socket.emit("user_online", user.phoneNumber);
  };

  const handleInputChange = (text) => {
    setMessage(text);
    if (!chatPartner) return;
    const roomId = [user.phoneNumber, chatPartner.phoneNumber].sort().join("_");
    if (text.length > 0) socket.emit("typing", { roomId });
    else socket.emit("stop_typing", { roomId });
  };

  const pickAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled)
      setUser({
        ...user,
        avatar: `data:image/jpeg;base64,${result.assets[0].base64}`,
      });
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) sendMessage(null, result.assets[0].base64);
  };

  const sendMessage = (textMsg = null, imageBase64 = null) => {
    if (!textMsg && !imageBase64 && message.trim() === "") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const roomId = [user.phoneNumber, chatPartner.phoneNumber].sort().join("_");
    const messageData = {
      roomId,
      sender: user.phoneNumber,
      text: textMsg || message,
      image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null,
      type: imageBase64 ? "image" : "text",
      status: "sent",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    socket.emit("send_message", messageData);
    socket.emit("stop_typing", { roomId });
    setChatHistory((prev) => [...prev, messageData]);
    setMessage("");
  };

  const renderAvatar = (u, size = 50) => {
    if (u?.avatar)
      return (
        <Image
          source={{ uri: u.avatar }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: "#333",
          }}
        />
      );
    return (
      <LinearGradient
        colors={["#4c669f", "#3b5998", "#192f6a"]}
        style={[
          styles.avatarPlaceholder,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text
          style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "bold" }}
        >
          {u?.name?.charAt(0) || "?"}
        </Text>
      </LinearGradient>
    );
  };

  // --- RENDER 1: LOGIN ---
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#000000", "#1a1a1a"]}
          style={styles.gradientBg}
        >
          <Animated.View
            style={[
              styles.loginCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.logoBadge}>
              <Svg height="65%" width="65%" viewBox="0 0 300 297">
                <G
                  transform="translate(0, 297) scale(0.1, -0.1)"
                  fill="#000000"
                >
                  <Path d="M1459 2546 c-14 -13 -35 -51 -49 -83 -72 -176 -131 -294 -143 -286 -4 2 -49 -16 -100 -41 -177 -88 -334 -244 -413 -411 -94 -196 -108 -445 -38 -652 19 -55 10 -70 -11 -19 -52 123 -66 343 -31 490 62 269 237 485 492 611 47 24 82 45 76 49 -12 7 -65 -11 -109 -37 -18 -10 -33 -15 -33 -10 0 4 -5 0 -11 -9 -5 -10 -15 -18 -20 -18 -25 0 -192 -145 -252 -219 -71 -87 -146 -254 -172 -380 -37 -185 -1 -476 64 -510 38 -21 40 10 10 136 -30 123 -23 332 13 443 36 109 89 205 160 289 61 72 191 177 254 205 17 7 50 26 73 40 24 15 45 26 47 23 4 -4 -84 -216 -107 -260 -6 -10 -27 -57 -48 -105 -46 -104 -108 -239 -123 -267 -6 -11 -23 -49 -39 -85 -35 -85 -99 -230 -133 -302 -55 -121 -76 -169 -76 -174 0 -3 -21 -49 -46 -102 -69 -145 -83 -184 -74 -208 19 -49 47 -39 215 80 208 148 216 155 256 243 21 44 44 85 51 89 6 4 67 8 134 9 l122 1 96 60 c53 32 112 68 131 80 20 11 51 35 71 52 20 18 40 32 45 32 8 0 45 -72 104 -205 7 -16 22 -50 33 -75 11 -25 31 -70 45 -100 21 -49 41 -72 107 -123 8 -7 29 -19 45 -27 17 -8 32 -18 35 -21 10 -11 97 -67 152 -98 55 -30 59 -31 82 -15 l25 16 -20 51 c-11 29 -34 80 -50 115 -16 34 -29 69 -29 77 0 8 -4 15 -8 15 -7 0 -32 57 -32 74 0 5 7 6 15 2 30 -11 64 59 111 224 10 36 12 222 3 277 -14 87 -17 102 -44 178 -47 136 -152 288 -257 371 -84 67 -190 125 -253 138 -19 4 -5 -7 40 -32 265 -143 427 -348 481 -608 20 -95 15 -310 -9 -394 -20 -72 -59 -158 -64 -143 -2 6 3 25 11 41 62 119 79 361 38 527 -46 185 -159 352 -317 472 -66 49 -183 115 -197 110 -8 -2 1 -12 20 -23 85 -48 215 -150 280 -219 99 -106 163 -231 198 -390 4 -16 8 -82 10 -145 3 -115 -15 -226 -51 -314 -7 -17 -10 -37 -8 -43 3 -7 0 -13 -5 -13 -8 0 -72 118 -72 134 0 2 -23 53 -51 113 -28 59 -59 129 -69 154 -10 25 -34 79 -53 120 -20 41 -65 142 -102 224 -73 164 -107 239 -135 300 -11 22 -47 103 -80 180 -34 77 -68 154 -75 170 -8 17 -22 51 -33 76 -18 41 -61 99 -74 99 -3 0 -16 -11 -29 -24z m126 -221 c48 -110 170 -382 270 -605 101 -223 240 -533 310 -690 70 -157 138 -306 151 -332 13 -26 24 -49 24 -52 0 -3 -80 47 -177 109 l-177 115 -88 197 c-289 645 -398 893 -398 902 0 35 -26 -13 -114 -217 -55 -125 -121 -274 -148 -330 l-47 -104 264 4 c146 1 265 0 265 -3 0 -3 -15 -12 -32 -21 -18 -8 -93 -54 -165 -102 l-133 -86 -142 0 -143 0 -40 -96 -39 -95 -81 -57 c-44 -30 -131 -93 -193 -139 -62 -46 -114 -83 -116 -83 -3 0 26 66 64 148 63 135 201 441 628 1399 86 194 159 349 163 345 3 -4 45 -97 94 -207z m-44 -550 c21 -45 39 -89 39 -97 0 -8 4 -18 9 -23 13 -14 131 -279 131 -294 0 -7 -4 -10 -9 -6 -6 3 -107 6 -225 6 -119 1 -218 4 -220 8 -3 3 9 38 26 76 49 114 99 225 135 305 19 41 39 85 44 98 13 34 26 20 70 -73z" />
                  <Path d="M930 771 c0 -19 133 -119 212 -159 119 -61 218 -84 358 -85 89 -1 134 4 200 22 104 28 223 89 295 154 35 30 59 46 67 41 9 -6 9 -3 -1 9 -16 20 -33 13 -106 -47 -64 -53 -130 -88 -230 -121 -147 -49 -367 -40 -513 20 -56 24 -171 94 -223 137 -48 39 -59 45 -59 29z" />
                  <Path d="M910 753 c0 -30 114 -129 195 -170 39 -20 108 -49 155 -66 76 -27 99 -30 215 -32 108 -2 146 1 225 21 87 22 260 98 260 114 0 4 14 13 30 20 17 7 29 15 26 17 -2 2 7 15 20 28 51 51 20 41 -59 -19 -89 -67 -194 -116 -304 -142 -98 -23 -313 -15 -403 16 -132 44 -285 137 -339 206 -19 24 -21 25 -21 7z" />
                </G>
              </Svg>
            </View>

            <Text style={styles.loginTitle}>ABX-Chat</Text>
            <Text style={styles.loginSubtitle}>Secure. Fast. Minimal.</Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#666"
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.inputPro}
                value={name}
                onChangeText={setName}
                placeholder="Your Name"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={20}
                color="#666"
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.inputPro}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone Number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity
              style={styles.loginBtnPro}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnTextPro}>ENTER &rarr;</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  // --- RENDER 2: PROFILE EDIT (FIXED LAYOUT) ---
  if (showProfile) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#111", "#000"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowProfile(false)}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 28 }} />
          </View>
          <View style={{ alignItems: "center", marginTop: 50 }}>
            {/* CONTAINER FOR AVATAR + ICONS */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={pickAvatar}>
                {renderAvatar(user, 120)}
                {/* EDIT PENCIL (RIGHT) */}
                <View style={styles.editBadge}>
                  <Ionicons name="pencil" size={16} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* TRASH (LEFT) */}
              {user.avatar && (
                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={() => setUser({ ...user, avatar: "" })}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.profileForm}>
              <Text style={styles.label}>DISPLAY NAME</Text>
              {/* FIXED INPUT VISIBILITY */}
              <TextInput
                style={styles.profileInput}
                value={user.name}
                onChangeText={(txt) => setUser({ ...user, name: txt })}
              />
              <Text style={styles.label}>PHONE ID</Text>
              <Text style={styles.readOnlyText}>{user.phoneNumber}</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={updateProfile}>
              <Text style={styles.saveBtnText}>Save Updates</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // --- RENDER 3: CONTACTS LIST ---
  if (!chatPartner) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.headerPro}>
          <View>
            <Text style={styles.headerTitlePro}>Chats</Text>
            <Text style={styles.headerSubPro}>{user.name}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowProfile(true)}>
            {renderAvatar(user, 45)}
          </TouchableOpacity>
        </View>
        <FlatList
          data={allUsers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => startChat(item)}
            >
              {renderAvatar(item, 55)}
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { fontWeight: "800" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.cardStatus, { opacity: 0.6 }]}>
                  Tap to start conversation
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#333" />
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // --- RENDER 4: CHAT SCREEN ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.chatHeaderPro}>
        <TouchableOpacity
          onPress={() => setChatPartner(null)}
          style={styles.backButtonPro}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {renderAvatar(chatPartner, 40)}
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.chatTitlePro}>{chatPartner.name}</Text>
          <Text
            style={[
              styles.chatStatusPro,
              {
                color:
                  partnerStatus === "Online" && !isTyping
                    ? "#00D664"
                    : "#00D664",
              },
            ]}
          >
            {isTyping ? "Typing..." : partnerStatus}
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={chatHistory}
        keyExtractor={(item, index) => index.toString()}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isMe = item.sender === user.phoneNumber;
          return (
            <View
              style={[
                styles.bubblePro,
                isMe ? styles.bubbleRightPro : styles.bubbleLeftPro,
              ]}
            >
              {item.type === "image" && (
                <Image
                  source={{ uri: item.image }}
                  style={[
                    styles.messageImage,
                    isMe
                      ? { borderTopRightRadius: 4 }
                      : { borderTopLeftRadius: 4 },
                  ]}
                />
              )}
              {item.text ? (
                <Text style={isMe ? styles.textRightPro : styles.textLeftPro}>
                  {item.text}
                </Text>
              ) : null}
              <View style={styles.metaContainer}>
                <Text style={styles.timePro}>{item.time}</Text>
                {isMe && (
                  <Ionicons
                    name={
                      item.status === "read" ? "checkmark-done" : "checkmark"
                    }
                    size={14}
                    color={item.status === "read" ? "#34B7F1" : "#888"}
                    style={{ marginLeft: 5 }}
                  />
                )}
              </View>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inputAreaPro}>
          <TouchableOpacity onPress={pickImage} style={styles.attachBtnPro}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
          <TextInput
            style={styles.chatInputPro}
            value={message}
            onChangeText={handleInputChange}
            onBlur={() => {
              const roomId = [user.phoneNumber, chatPartner.phoneNumber]
                .sort()
                .join("_");
              socket.emit("stop_typing", { roomId });
            }}
            placeholder="Type a message..."
            placeholderTextColor="#666"
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            style={styles.sendBtnPro}
          >
            <Ionicons name="arrow-up" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  gradientBg: { flex: 1, justifyContent: "center", padding: 20 },

  // Login Pro
  loginCard: {
    backgroundColor: "rgba(30,30,30,0.9)",
    padding: 30,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  logoBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  loginTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 1,
  },
  loginSubtitle: {
    color: "#888",
    marginBottom: 40,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    width: "100%",
    height: 60,
    borderWidth: 1,
    borderColor: "#333",
  },
  inputPro: { flex: 1, color: "#fff", fontSize: 16 },
  loginBtnPro: {
    backgroundColor: "#fff",
    width: "100%",
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  loginBtnTextPro: { color: "#000", fontWeight: "bold", fontSize: 18 },

  // List Pro
  headerPro: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 25,
    backgroundColor: "#000",
  },
  headerTitlePro: { color: "#fff", fontSize: 34, fontWeight: "800" },
  headerSubPro: { color: "#666", fontSize: 14, marginTop: 5 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardName: { color: "#fff", fontSize: 17 },
  cardStatus: { color: "#555", fontSize: 13, marginTop: 4 },

  // Chat Pro
  chatHeaderPro: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#121212",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  chatTitlePro: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  chatStatusPro: { fontSize: 12 },

  bubblePro: {
    maxWidth: "75%",
    padding: 14,
    borderRadius: 22,
    marginBottom: 12,
    marginHorizontal: 15,
  },
  bubbleRightPro: {
    alignSelf: "flex-end",
    backgroundColor: "#fff",
    borderBottomRightRadius: 4,
  },
  bubbleLeftPro: {
    alignSelf: "flex-start",
    backgroundColor: "#222",
    borderBottomLeftRadius: 4,
  },
  textRightPro: { color: "#000", fontSize: 16 },
  textLeftPro: { color: "#fff", fontSize: 16 },
  timePro: { fontSize: 10, color: "#aaa", marginTop: 4 },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 5,
  },

  inputAreaPro: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingBottom: 20,
    backgroundColor: "#121212",
  },
  attachBtnPro: {
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 25,
    marginRight: 10,
  },
  chatInputPro: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    color: "#fff",
    padding: 15,
    borderRadius: 30,
    marginRight: 10,
    fontSize: 16,
  },
  sendBtnPro: {
    backgroundColor: "#fff",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  // Profile Fixes
  avatarContainer: {
    position: "relative",
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#007AFF",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
  },
  removeBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "#FF3B30",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
  },
  profileForm: { width: "85%", marginTop: 20 },
  label: {
    color: "#666",
    fontSize: 12,
    marginBottom: 8,
    marginTop: 20,
    fontWeight: "bold",
  },

  // NEW: Dedicated Style for Profile Inputs
  profileInput: {
    backgroundColor: "#111",
    color: "#fff",
    fontSize: 16,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#333",
  },

  readOnlyText: {
    color: "#fff",
    fontSize: 18,
    padding: 15,
    backgroundColor: "#111",
    borderRadius: 15,
    overflow: "hidden",
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    width: "85%",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 40,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  messageImage: { width: 220, height: 220, borderRadius: 15, marginBottom: 5 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
});
