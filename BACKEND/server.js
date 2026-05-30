import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Groq from "groq-sdk";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   MONGODB CONNECTION
========================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

/* =========================
   GROQ
========================= */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* =========================
   USER SCHEMA
========================= */

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

/* =========================
   CHAT SCHEMA
========================= */

const chatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: String,
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        content: String,
      },
    ],
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);

/* =========================
   AUTH MIDDLEWARE
   FIX: reads "Bearer <token>" format
========================= */

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Support both "Bearer <token>" and raw token
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

/* =========================
   REGISTER
========================= */

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ username, email, password: hashedPassword });

    // FIX: use JWT_SECRET from env
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET
    );

    res.json({
      message: "Registration successful",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // FIX: use JWT_SECRET from env
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Login failed" });
  }
});

/* =========================
   GET ALL CHATS (sidebar)
========================= */

app.get("/chats", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .select("title createdAt")   // only send title, not all messages
      .sort({ createdAt: -1 });

    res.json(chats);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

/* =========================
   GET SINGLE CHAT (load messages)
========================= */

app.get("/chats/:id", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!chat) return res.status(404).json({ error: "Chat not found" });

    res.json(chat);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

/* =========================
   DELETE CHAT
========================= */

app.delete("/chats/:id", authMiddleware, async (req, res) => {
  try {
    await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Chat deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

/* =========================
   CHAT API
   FIX 1: sends full conversation history to Groq (memory)
   FIX 2: returns chatId so frontend can track active chat
========================= */

app.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message, chatId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Build conversation history for Groq
    let conversationHistory = [];
    let chat = null;

    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
      if (chat) {
        // Send previous messages so Groq has memory
        conversationHistory = chat.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    }

    // Add current user message
    conversationHistory.push({ role: "user", content: message });

    // STREAM HEADERS
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    // GROQ with full history
    const completion = await groq.chat.completions.create({
      messages: conversationHistory,
      model: "llama-3.3-70b-versatile",
      stream: true,
    });

    let fullReply = "";

    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content || "";
      fullReply += text;
      res.write(text);
    }

    // FIX: send chatId in a special header before ending
    // We'll save first, then the frontend can read the header
    let savedChatId;

    if (chatId && chat) {
      // Update existing chat
      await Chat.findByIdAndUpdate(chatId, {
        $push: {
          messages: {
            $each: [
              { role: "user", content: message },
              { role: "assistant", content: fullReply },
            ],
          },
        },
      });
      savedChatId = chatId;
    } else {
      // Create new chat
      const newChat = await Chat.create({
        userId: req.user.id,
        title: message.slice(0, 40),
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: fullReply },
        ],
      });
      savedChatId = newChat._id.toString();
    }

    // Send chatId as a special trailing marker the frontend can parse
    res.write(`\n__CHAT_ID__:${savedChatId}`);
    res.end();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Chat failed" });
  }
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});