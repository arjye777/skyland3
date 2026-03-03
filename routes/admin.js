const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const router = express.Router();

function adm(req, res, next) {
  if (!req.session.admin) return res.json({ ok: false, msg: 'Not authorized' });
  next();
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.admins.findOne({ username }, (err, admin) => {
    if (!admin || !bcrypt.compareSync(password, admin.password)) return res.json({ ok: false, msg: 'Invalid credentials' });
    req.session.admin = { username: admin.username };
    res.json({ ok: true });
  });
});

router.post('/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
router.get('/me', (req, res) => res.json({ ok: !!req.session.admin }));

router.get('/stats', adm, (req, res) => {
  db.bookings.count({}, (e, total_bookings) => {
  db.bookings.count({ status: 'Pending' }, (e, pending_bookings) => {
  db.bookings.count({ status: 'Confirmed' }, (e, confirmed_bookings) => {
  db.users.count({}, (e, total_customers) => {
  db.orders.count({}, (e, total_orders) => {
  db.orders.count({ status: 'Preparing' }, (e, pending_orders) => {
  db.requests.count({}, (e, total_requests) => {
  db.requests.count({ status: 'Pending' }, (e, pending_requests) => {
  db.menu.count({}, (e, menu_items) => {
  db.bookings.find({ status: 'Confirmed' }, (e, confirmed) => {
    const revenue = confirmed.reduce((s, b) => s + (b.total_price || 0), 0);
    res.json({ ok: true, stats: { total_bookings, pending_bookings, confirmed_bookings, total_customers, total_orders, pending_orders, total_requests, pending_requests, menu_items, revenue } });
  }); }); }); }); }); }); }); }); }); });
});

router.get('/activity', adm, (req, res) => {
  db.bookings.find({}).sort({ created_at: -1 }).limit(5).exec((e, bookings) => {
  db.orders.find({}).sort({ created_at: -1 }).limit(5).exec((e, orders) => {
  db.requests.find({}).sort({ created_at: -1 }).limit(5).exec((e, requests) => {
    res.json({ ok: true, bookings: bookings||[], orders: orders||[], requests: requests||[] });
  }); }); });
});

router.get('/bookings', adm, (req, res) => {
  const query = req.query.status ? { status: req.query.status } : {};
  db.bookings.find(query).sort({ created_at: -1 }).exec((err, docs) => res.json({ ok: true, bookings: docs||[] }));
});

router.patch('/bookings/:id', adm, (req, res) => {
  db.bookings.update({ id: req.params.id }, { $set: { status: req.body.status } }, {}, () => res.json({ ok: true }));
});

router.get('/menu', adm, (req, res) => {
  db.menu.find({}).sort({ category: 1, name: 1 }).exec((err, docs) => res.json({ ok: true, items: docs||[] }));
});

router.post('/menu', adm, (req, res) => {
  const { name, price, category, icon, description } = req.body;
  if (!name || !price) return res.json({ ok: false, msg: 'Name and price required' });
  db.menu.insert({ name, price: Number(price), category: category||'Other', icon: icon||'*', description: description||'', available: true }, (err, doc) => {
    res.json({ ok: true, msg: 'Menu item added!', id: doc._id });
  });
});

router.put('/menu/:id', adm, (req, res) => {
  const { name, price, category, icon, description, available } = req.body;
  db.menu.update({ _id: req.params.id }, { $set: { name, price: Number(price), category, icon: icon||'*', description, available: available !== false } }, {}, () => res.json({ ok: true }));
});

router.delete('/menu/:id', adm, (req, res) => {
  db.menu.remove({ _id: req.params.id }, {}, () => res.json({ ok: true }));
});

router.get('/requests', adm, (req, res) => {
  const query = req.query.status ? { status: req.query.status } : {};
  db.requests.find(query).sort({ created_at: -1 }).exec((err, docs) => res.json({ ok: true, requests: docs||[] }));
});

router.patch('/requests/:id', adm, (req, res) => {
  db.requests.update({ id: req.params.id }, { $set: { status: req.body.status, admin_note: req.body.admin_note||'' } }, {}, () => res.json({ ok: true }));
});

router.get('/orders', adm, (req, res) => {
  db.orders.find({}).sort({ created_at: -1 }).exec((err, docs) => res.json({ ok: true, orders: docs||[] }));
});

router.patch('/orders/:id', adm, (req, res) => {
  db.orders.update({ id: req.params.id }, { $set: { status: req.body.status } }, {}, () => res.json({ ok: true }));
});

router.get('/customers', adm, (req, res) => {
  db.users.find({}).sort({ created_at: -1 }).exec((err, users) => {
    if (!users || !users.length) return res.json({ ok: true, customers: [] });
    let done = 0;
    const result = users.map(u => ({ ...u, password: undefined, bookings: 0, orders: 0, requests: 0 }));
    users.forEach((u, i) => {
      db.bookings.count({ user_id: u._id }, (e, bc) => {
      db.orders.count({ user_id: u._id }, (e, oc) => {
      db.requests.count({ user_id: u._id }, (e, rc) => {
        result[i].bookings = bc; result[i].orders = oc; result[i].requests = rc;
        if (++done === users.length) res.json({ ok: true, customers: result });
      }); }); });
    });
  });
});

module.exports = router;