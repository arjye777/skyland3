const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'skyland-secret-2024', resave: false, saveUninitialized: false, cookie: { maxAge: 86400000 } }));
app.use('/api/auth',  require('./routes/auth'));
app.use('/api',       require('./routes/customer'));
app.use('/api/admin', require('./routes/admin'));
app.get('/',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.listen(PORT, () => {
  console.log('\n  Customer: http://localhost:' + PORT);
  console.log('  Admin:    http://localhost:' + PORT + '/admin');
  console.log('  Login: admin / admin123\n');
});