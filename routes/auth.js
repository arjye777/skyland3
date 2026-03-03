const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.json({ ok: false, msg: 'All fields required' });
  if (!email.toLowerCase().includes('@gmail.com')) return res.json({ ok: false, msg: 'Please use a Gmail address' });
  if (password.length < 6) return res.json({ ok: false, msg: 'Password must be at least 6 characters' });
  db.users.findOne({ email }, (err, doc) => {
    if (doc) return res.json({ ok: false, msg: 'Email already registered' });
    db.users.insert({ name, email, password: bcrypt.hashSync(password, 10), created_at: new Date().toLocaleString() }, (err, newDoc) => {
      res.json({ ok: true, msg: 'Account created! Please sign in.' });
    });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.users.findOne({ email }, (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) return res.json({ ok: false, msg: 'Invalid email or password' });
    req.session.user = { id: user._id, name: user.name, email: user.email };
    res.json({ ok: true, user: req.session.user });
  });
});

router.post('/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });

router.get('/me', (req, res) => {
  if (req.session.user) res.json({ ok: true, user: req.session.user });
  else res.json({ ok: false });
});

module.exports = router;