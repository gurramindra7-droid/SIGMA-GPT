import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Groq from "groq-sdk";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import multer from "multer";
import fs from "fs";
import { PDFParse } from "pdf-parse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, ".env") });

// ✅ Debug: confirm API key is loaded (show only prefix & length for security)
console.log("[DEBUG] MONGO_URI:", process.env.MONGO_URI ? "✅ Loaded" : "❌ MISSING");
console.log("[DEBUG] GROQ_API_KEY:", process.env.GROQ_API_KEY ? `✅ Loaded (prefix: ${process.env.GROQ_API_KEY.slice(0, 8)}..., length: ${process.env.GROQ_API_KEY.length})` : "❌ MISSING");
console.log("[DEBUG] JWT_SECRET:", process.env.JWT_SECRET ? "✅ Loaded" : "❌ MISSING");

const app = express();

app.use(
  cors({
    origin: [
      "https://sigma-gpt-lake.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));

// ─── Multer Config ───────────────────────────────────────────────────────────
const uploadsDir = join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split(".").pop();
    cb(null, `${unique}.${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImages = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const allowedPdfs = ["application/pdf"];
  const allowed = [...allowedImages, ...allowedPdfs];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ✅ Health check — also used by Render cold-start pings
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api", (req, res) => {
  res.json({ message: "SIGMA GPT Backend is running ✅" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ Smart title generator using Groq
const generateChatTitle = async (message) => {
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Generate a very short, catchy 2-4 word chat title for this message. No quotes, no punctuation, just the title words. Example: "DSA Recursion Errors", "React Hook Issues", "Python File Parsing". Message: "${message}"`,
        },
      ],
      max_tokens: 20,
    });
    const title = res.choices[0]?.message?.content?.trim();
    return title || message.slice(0, 40);
  } catch {
    return message.slice(0, 40);
  }
};

// ─── Schemas & Models ────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model("User", userSchema);

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

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: "No token provided" });
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

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!email.endsWith("@gmail.com")) {
      return res.status(400).json({ error: "Only Gmail accounts are allowed" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

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

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    if (!email.endsWith("@gmail.com")) {
      return res.status(400).json({ error: "Only Gmail accounts are allowed" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

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

// ─── Upload Routes ───────────────────────────────────────────────────────────

app.post("/api/upload/image", authMiddleware, upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      name: req.file.originalname,
      type: "image",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Image upload failed" });
  }
});

app.post("/api/upload/pdf", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Extract text from PDF
    const filePath = join(uploadsDir, req.file.filename);
    const dataBuffer = fs.readFileSync(filePath);
    const pdfParser = new PDFParse({ data: dataBuffer });
    try {
      const pdfData = await pdfParser.getText();
      const extractedText = pdfData.text.slice(0, 15000); // limit to 15k chars

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        url: fileUrl,
        name: req.file.originalname,
        type: "pdf",
        text: extractedText,
        pages: pdfData.total,
      });
    } finally {
      await pdfParser.destroy();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "PDF upload failed" });
  }
});

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// ─── Chat Routes ──────────────────────────────────────────────────────────────

app.get("/api/chats", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .select("title createdAt")
      .sort({ createdAt: -1 });
    res.json(chats);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

app.get("/api/chats/:id", authMiddleware, async (req, res) => {
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

app.delete("/api/chats/:id", authMiddleware, async (req, res) => {
  try {
    await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Chat deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

app.post("/api/chat", authMiddleware, async (req, res) => {
  try {
    const { message, chatId } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    let conversationHistory = [];
    let chat = null;

    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
      if (chat) {
        conversationHistory = chat.messages.map((m) => ({
          role: m.role,
          content: m.type && m.type !== "text"
            ? `[${m.type.toUpperCase()}]: ${m.content || "(file attached)"}`
            : m.content,
        }));
      }
    }

    // Build the user message — include file context if present
    let userContent = message;
    if (req.body.fileType && req.body.fileText) {
      userContent = `[${req.body.fileType.toUpperCase()} - ${req.body.fileName}]:\n${req.body.fileText}\n\nUser asks: ${message}`;
    } else if (req.body.fileType) {
      userContent = `[${req.body.fileType.toUpperCase()} - ${req.body.fileName}]: ${message}`;
    }
    conversationHistory.push({ role: "user", content: userContent });

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

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

    // Build message objects with file metadata
    const userMsgObj = {
      role: "user",
      content: message,
      type: req.body.fileType || "text",
      fileUrl: req.body.fileUrl || null,
      fileName: req.body.fileName || null,
    };
    const assistantMsgObj = { role: "assistant", content: fullReply, type: "text" };

    let savedChatId;

    if (chatId && chat) {
      await Chat.findByIdAndUpdate(chatId, {
        $push: {
          messages: { $each: [userMsgObj, assistantMsgObj] },
        },
      });
      savedChatId = chatId;
    } else {
      const title = await generateChatTitle(message);
      const newChat = await Chat.create({
        userId: req.user.id,
        title,
        messages: [userMsgObj, assistantMsgObj],
      });
      savedChatId = newChat._id.toString();
    }

    res.write(`\n__CHAT_ID__:${savedChatId}`);
    res.end();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Chat failed" });
  }
});

// ─── Error Middleware ─────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.includes?.("not allowed")) {
    return res.status(400).json({ error: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ✅ Required for Vercel serverless deployment
export default app;