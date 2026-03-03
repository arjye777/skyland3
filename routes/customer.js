const express = require('express');
const db = require('../db/database');
const router = express.Router();

function auth(req, res, next) {
  if (!req.session.user) return res.json({ ok: false, msg: 'Not logged in' });
  next();
}

router.post('/bookings', auth, (req, res) => {
  const { room, price_per_night, checkin, checkout, guests, special_request } = req.body;
  if (!room || !checkin || !checkout) return res.json({ ok: false, msg: 'Missing fields' });
  const nights = Math.round((new Date(checkout) - new Date(checkin)) / 86400000);
  if (nights <= 0) return res.json({ ok: false, msg: 'Invalid dates' });
  const u = req.session.user;
  const doc = { id: 'BK'+Date.now(), user_id: u.id, user_name: u.name, user_email: u.email, room, price_per_night: Number(price_per_night), total_price: Number(price_per_night)*nights, nights, checkin, checkout, guests: guests||1, special_request: special_request||'', status: 'Pending', created_at: new Date().toLocaleString() };
  db.bookings.insert(doc, (err, newDoc) => {
    if (err) return res.json({ ok: false, msg: 'Error saving booking' });
    res.json({ ok: true, id: doc.id, msg: 'Booking submitted!' });
  });
});

router.get('/bookings', auth, (req, res) => {
  db.bookings.find({ user_id: req.session.user.id }).sort({ created_at: -1 }).exec((err, docs) => {
    res.json({ ok: true, bookings: docs || [] });
  });
});

router.get('/menu', (req, res) => {
  db.menu.find({ available: true }).sort({ category: 1, name: 1 }).exec((err, docs) => {
    res.json({ ok: true, items: docs || [] });
  });
});

router.post('/orders', auth, (req, res) => {
  const { item_name, quantity, location, note } = req.body;
  if (!item_name) return res.json({ ok: false, msg: 'Select an item' });
  const u = req.session.user;
  const doc = { id: 'ORD'+Date.now(), user_id: u.id, user_name: u.name, item_name, quantity: quantity||1, location: location||'Room Delivery', note: note||'', status: 'Preparing', created_at: new Date().toLocaleString() };
  db.orders.insert(doc, () => res.json({ ok: true, msg: 'Order placed! Estimated 20-30 minutes.' }));
});

router.get('/orders', auth, (req, res) => {
  db.orders.find({ user_id: req.session.user.id }).sort({ created_at: -1 }).exec((err, docs) => {
    res.json({ ok: true, orders: docs || [] });
  });
});

router.post('/requests', auth, (req, res) => {
  const { type, detail } = req.body;
  if (!detail || !detail.trim()) return res.json({ ok: false, msg: 'Please describe your request' });
  const u = req.session.user;
  const doc = { id: 'REQ'+Date.now(), user_id: u.id, user_name: u.name, type: type||'Other', detail, status: 'Pending', admin_note: '', created_at: new Date().toLocaleString() };
  db.requests.insert(doc, () => res.json({ ok: true, msg: 'Request submitted!' }));
});

router.get('/requests', auth, (req, res) => {
  db.requests.find({ user_id: req.session.user.id }).sort({ created_at: -1 }).exec((err, docs) => {
    res.json({ ok: true, requests: docs || [] });
  });
});

module.exports = router;