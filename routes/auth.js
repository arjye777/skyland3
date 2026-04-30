const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db/database");
const router = express.Router();

router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.json({ ok: false, msg: "All fields required" });
  if (!email.toLowerCase().includes("@gmail.com"))
    return res.json({ ok: false, msg: "Please use a Gmail address" });
  if (password.length < 6)
    return res.json({
      ok: false,
      msg: "Password must be at least 6 characters",
    });

  db.users.findOne({ email }, (err, doc) => {
    if (err) {
      console.error("Find error:", err);
      return res.json({ ok: false, msg: "Database error" });
    }
    if (doc) return res.json({ ok: false, msg: "Email already registered" });

    db.users.insert(
      {
        name,
        email,
        password: bcrypt.hashSync(password, 10),
        created_at: new Date().toLocaleString(),
      },
      (err, newDoc) => {
        if (err) {
          console.error("Insert error:", err);
          return res.json({ ok: false, msg: "Error creating account" });
        }
        console.log("User registered:", email);
        res.json({ ok: true, msg: "Account created! Please sign in." });
      },
    );
  });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  console.log("Login attempt:", email);

  db.users.findOne({ email }, (err, user) => {
    if (err) {
      console.error("Login error:", err);
      return res.json({ ok: false, msg: "Database error" });
    }

    if (!user) {
      console.log("User not found:", email);
      return res.json({ ok: false, msg: "Invalid email or password" });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    console.log("Password valid:", isValid);

    if (!isValid) {
      return res.json({ ok: false, msg: "Invalid email or password" });
    }

    // Set session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    // Explicitly save the session
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.json({ ok: false, msg: "Session error" });
      }

      console.log("Login successful for:", email);
      console.log("Session ID:", req.sessionID);
      console.log("Session user:", req.session.user);

      res.json({ ok: true, user: req.session.user });
    });
  });
});

router.post("/logout", (req, res) => {
  console.log("Logout:", req.session.user?.email);
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (req.session.user) {
    console.log("Session valid for:", req.session.user.email);
    res.json({ ok: true, user: req.session.user });
  } else {
    console.log("No active session");
    res.json({ ok: false });
  }
});

module.exports = router;
