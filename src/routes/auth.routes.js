const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// Register
// - If no users exist yet: allow creating the first user (default Admin)
// - If users exist: only an Admin (with Bearer token) can create users
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email, password are required" });
    }

    const emailNorm = email.toLowerCase();

    const exists = await User.findOne({ email: emailNorm });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const usersCount = await User.countDocuments();

    if (usersCount > 0) {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;

      if (!token) {
        return res.status(401).json({ message: "Missing token (admin required)" });
      }

      let payload;

      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      if (payload.role !== "Admin") {
        return res.status(403).json({ message: "Only Admin can create users" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: emailNorm,
      passwordHash,
      role: usersCount === 0 ? role || "Admin" : role || "Student",
    });

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Public student registration
router.post("/student-register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email, password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const emailNorm = email.toLowerCase().trim();

    const exists = await User.findOne({ email: emailNorm });

    if (exists) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: emailNorm,
      passwordHash,
      role: "Student",
    });

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Current user
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;