require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const axios = require('axios');


// Import pollers
const { startPoller } = require("./jobs/binancepoller");
const { startMonoPoller } = require("./jobs/monopoller");
const { startReconcilePoller } = require('./jobs/reconcilepoller');

// Import Routes
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
const binancebalance = require("./routes/binancebalance")
const bankinfo = require("./routes/bankbalance")

const app = express();

const PORT = process.env.PORT || 3000; // Fallback to 3000 if PORT is not defined

// ----- Global Middlewares -----
app.use(express.json());
app.use(cors());
app.use(helmet());

// ----- Global Rate Limiter -----
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: "Too many requests, please try again later" },
});
app.use(apiLimiter);

// ----- Initialize Passport -----
app.use(passport.initialize());

// ----- JWT Authentication Middleware -----
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: "Forbidden" });
    req.user = user;
    next();
  });
};

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



// ----- Root Route -----
app.get("/", (req, res) => res.send("🚀 API Running"));

// ----- Global Error Handler -----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

// ----- Startup Logic -----
const startServer = async () => {
  try {
    // 1) Connect to MongoDB
    await mongoose.connect(require("./routes/config").mongoURI);
    console.log("✅ MongoDB Connected");

    // 2) Start your pollers
    startPoller();
    startMonoPoller();
    startReconcilePoller();


    // 3) Finally, start listening
    app.listen(PORT, () => {
      console.log(`🔥 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

startServer();