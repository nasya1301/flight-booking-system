const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Import mysql2 dengan promise
require('dotenv').config(); // PENTING: Muat variabel .env di awal aplikasi

const app = express();

// --- Konfigurasi Database ---
// Ambil kredensial database dari variabel lingkungan (dari file .env)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // Pastikan ini sudah diisi di .env
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306 // Pastikan port adalah integer
};

let dbPool; // Deklarasikan variabel untuk connection pool

// Fungsi untuk menginisialisasi database connection pool
async function initializeDatabase() {
  try {
    dbPool = mysql.createPool(dbConfig);
    // Uji koneksi awal untuk memastikan kredensial benar
    const connection = await dbPool.getConnection();
    console.log('Successfully connected to MySQL database!');
    connection.release(); // Lepaskan koneksi kembali ke pool
  } catch (err) {
    console.error('Failed to connect to the database:', err.message);
    console.error('Please check your .env file and database credentials.');
    // Opsional: Keluar dari aplikasi jika koneksi database penting
    // process.exit(1);
  }
}

// Panggil fungsi inisialisasi database saat aplikasi dimulai
initializeDatabase();

// --- Middleware Aplikasi ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware session
app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY, // Pastikan SESSION_SECRET_KEY ada di .env
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Gunakan secure cookie di produksi (HTTPS)
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 jam
    }
  })
);

// Middleware untuk melampirkan connection database ke objek req
app.use(async (req, res, next) => {
  if (!dbPool) {
    // Jika pool belum terinisialisasi (misalnya, ada error saat startup)
    return res.status(500).send('Database connection is not available.');
  }
  try {
    req.db = await dbPool.getConnection(); // Ambil koneksi dari pool
    // Pastikan koneksi dilepaskan setelah request selesai, bahkan jika ada error
    res.on('finish', () => {
      if (req.db) {
        req.db.release();
        // console.log('Database connection released.'); // Untuk debugging
      }
    });
    next();
  } catch (err) {
    console.error('Error acquiring database connection:', err.message);
    res.status(500).send('Failed to get database connection.');
  }
});

// Konfigurasi EJS dan static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'src', 'public')));

// --- Routes ---
// Pastikan rute-rute ini dapat mengakses req.db
app.use('/', require('./src/routes/authRoutes'));
app.use('/', require('./src/routes/adminRoutes'));
app.use('/', require('./src/routes/userRoutes'));

// Menutup pool koneksi saat aplikasi dihentikan
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  if (dbPool) {
    await dbPool.end();
  }
  console.log('Database pool closed.');
  process.exit(0);
});

module.exports = app;
