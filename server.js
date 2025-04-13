// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const passport = require("passport");

// Import Routes
const adminRoutes = require("./routes/adminRoutes");               // Public: For adding pending users
const registrationRoutes = require("./routes/registrationRoutes"); // Public: For completing registration with a password
const authRoutes = require("./routes/authRoutes");                 // Public: For signing in and generating JWT
const reconcileRoutes = require("./routes/reconcile");             // Protected: Reconciliation endpoints
const binanceRoutes = require("./routes/binance");                 // Protected: Binance endpoints
const monoconnectRoutes = require("./routes/Monoconnect");         // Protected: Mono (bank linking) endpoints
const config = require("./routes/config");

// Import your User model and the poller function
const User = require("./models/user");
const { startUserPollers } = require("./jobs/realtimePoller");

const app = express();

// ----- Global Middlewares -----
app.use(express.json());
app.use(cors());
app.use(helmet());

// ----- Global Rate Limiter -----
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: "Too many requests, please try again later" }
});
app.use(apiLimiter);

// ----- Initialize Passport -----
app.use(passport.initialize());

// ----- Global JWT Authentication Middleware -----
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Expect "Bearer <token>"
  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    req.user = user;
    next();
  });
};

// ----- Database Connection -----
mongoose.connect(config.mongoURI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => {
    console.log("✅ MongoDB Connected");

    // Start pollers for all eligible users once connected.
    startPollersForAllUsers();
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// ----- Public Routes -----
app.use("/admin", adminRoutes);
app.use("/registration", registrationRoutes);
app.use("/auth", authRoutes);

// ----- Protected Routes -----
app.use("/reconcile", authenticateToken, reconcileRoutes);
app.use("/binance", authenticateToken, binanceRoutes);
app.use("/monoconnect", authenticateToken, monoconnectRoutes);

// ----- Root Route -----
app.get("/", (req, res) => res.send("🚀 API Running"));

// ----- Global Error Handler -----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

// ----- Start Express Server -----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));

/**
 * Function to fetch eligible users from the database and trigger their pollers.
 */
async function startPollersForAllUsers() {
  try {
    const users = await User.find({}); // Adjust query if needed.
    if (!users || users.length === 0) {
      console.log("No eligible users found; pollers will not start.");
      return;
    }
    users.forEach(user => {
      // Only start pollers if all required credentials are present.
      if (user.binanceKey && user.binanceSecret && user.monoAccountId) {
        startUserPollers(user);
        console.log(`Started pollers for user ${user._id}`);
      } else {
        console.log(`User ${user._id} lacks required credentials; skipping pollers.`);
      }
    });
  } catch (error) {
    console.error("Error starting pollers for users:", error.message);
  }
}
