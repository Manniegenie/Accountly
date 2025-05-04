require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ----- CORS: Allow both www and non-www domains -----
app.use(cors({
  origin: [
    'https://priscaai.online',
    'https://www.priscaai.online',
    'https://accountly-frontend.vercel.app' // ✅ add this
  ],
  credentials: true
}));


// ----- Middlewares -----
app.use(express.json());
app.use(helmet());

// ----- Rate Limiting -----
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: "Too many requests, please try again later" },
});
app.use(apiLimiter);

// ----- Passport Init -----
app.use(passport.initialize());

// ----- JWT Middleware -----
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized: No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: "Forbidden: Invalid token." });
    req.user = user;
    next();
  });
};

// ----- Routes -----
const adminRoutes = require("./routes/adminRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const authRoutes = require("./routes/authRoutes");
const reconcileRoutes = require("./routes/reconcile");
const binanceRoutes = require("./routes/binance");
const monoconnectRoutes = require("./routes/Monoconnect");
const logRoutes = require("./routes/log");
const inferreddealRoutes = require("./routes/inferreddeal");
const binancedealRoutes = require("./routes/binancedeal");
const bankdealRoutes = require("./routes/bankdeal");
const binancebalance = require("./routes/binancebalance");
const bankinfo = require("./routes/bankbalance");
const monoWebhookRoutes = require('./routes/bankwebhook');

// ----- Public Routes -----
app.use("/admin", adminRoutes);
app.use("/registration", registrationRoutes);
app.use("/auth", authRoutes);

// ----- Protected Routes -----
app.use("/reconcile", authenticateToken, reconcileRoutes);
app.use("/binance", authenticateToken, binanceRoutes);
app.use("/monoconnect", authenticateToken, monoconnectRoutes);
app.use("/log", authenticateToken, logRoutes);
app.use("/complete-deal", authenticateToken, inferreddealRoutes);
app.use("/binance-transactions", authenticateToken, binancedealRoutes);
app.use("/bank-transactions", authenticateToken, bankdealRoutes);
app.use("/binance-balance", authenticateToken, binancebalance);
app.use("/bankinfo", authenticateToken, bankinfo);
app.use("/bank-balance", authenticateToken, monoWebhookRoutes);

// ----- Root Endpoint -----
app.get("/", (req, res) => {
  res.send(`🚀 API Running at ${new Date().toISOString()}`);
});

// ----- Global Error Handler -----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

// ----- Start Server -----
const startServer = async () => {
  try {
    await mongoose.connect(require("./routes/config").mongoURI);
    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🔥 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

startServer();
