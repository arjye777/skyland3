const Datastore = require('@seald-io/nedb');
const bcrypt = require('bcryptjs');
const path = require('path');
const dbDir = path.join(__dirname);

const db = {
  users:    new Datastore({ filename: path.join(dbDir, 'users.db'),    autoload: true }),
  bookings: new Datastore({ filename: path.join(dbDir, 'bookings.db'), autoload: true }),
  menu:     new Datastore({ filename: path.join(dbDir, 'menu.db'),     autoload: true }),
  orders:   new Datastore({ filename: path.join(dbDir, 'orders.db'),   autoload: true }),
  requests: new Datastore({ filename: path.join(dbDir, 'requests.db'), autoload: true }),
  admins:   new Datastore({ filename: path.join(dbDir, 'admins.db'),   autoload: true }),
};

// Seed default admin
db.admins.findOne({ username: 'admin' }, (err, doc) => {
  if (!doc) {
    db.admins.insert({ username: 'admin', password: bcrypt.hashSync('admin123', 10) });
    console.log('  Admin account created  ->  admin / admin123');
  }
});

// Seed default menu
db.menu.count({}, (err, count) => {
  if (count === 0) {
    db.menu.insert([
      { name: 'Skyland Breakfast',   price: 250, category: 'Breakfast',   icon: 'B', description: 'Eggs, toast, bacon and fresh juice',    available: true },
      { name: 'Grilled Salmon',      price: 450, category: 'Main Course', icon: 'F', description: 'Atlantic salmon with herbs and lemon',   available: true },
      { name: 'Caesar Salad',        price: 200, category: 'Main Course', icon: 'S', description: 'Fresh romaine, croutons and parmesan',   available: true },
      { name: 'Chocolate Lava Cake', price: 180, category: 'Desserts',    icon: 'C', description: 'Warm chocolate with vanilla ice cream',  available: true },
      { name: 'Fresh Mango Shake',   price: 150, category: 'Beverages',   icon: 'M', description: '100% fresh local mango',                available: true },
      { name: 'Club Sandwich',       price: 220, category: 'Snacks',      icon: 'W', description: 'Triple-decker with fries',              available: true },
      { name: 'Beef Sinigang',       price: 380, category: 'Main Course', icon: 'Z', description: 'Classic Filipino sour soup',            available: true },
      { name: 'Leche Flan',          price: 120, category: 'Desserts',    icon: 'L', description: 'Silky caramel custard',                 available: true },
      { name: 'Buko Pandan Shake',   price: 110, category: 'Beverages',   icon: 'P', description: 'Refreshing coconut pandan drink',       available: true },
      { name: 'Pancit Canton',       price: 280, category: 'Main Course', icon: 'N', description: 'Stir-fried noodles with vegetables',     available: true },
    ]);
    console.log('  Default menu items seeded');
  }
});

module.exports = db;
