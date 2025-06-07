const bcrypt = require('bcrypt');
// const db = require('../config/db'); // <--- Hapus atau komentari baris ini!
/* eslint-disable no-console*/

exports.register = async (req, res) => {
  const { username, email, phoneNumber, password, confirmPassword } = req.body;

  // Tambahkan pengecekan `req.db` untuk memastikan koneksi tersedia
  if (!req.db) {
    console.error('Database connection not available in register route');
    return res.status(500).send('Database connection error.');
  }

  if (!username || !email || !password) return res.send('Semua field harus diisi');
  if (password !== confirmPassword) return res.send('Password tidak sesuai');

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Ganti db.queryAsync dengan req.db.query
    await req.db.query( // <--- PERUBAHAN DI SINI!
      'INSERT INTO Users (username, email, PhoneNumber, PasswordHash, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, phoneNumber, hashedPassword, 'user']
    );
    res.redirect('/');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.send('Username atau email sudah terdaftar');
    }
    console.error('Error during registration:', err); // Log error lebih detail
    return res.status(500).send('Terjadi kesalahan pada server');
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  // Tambahkan pengecekan `req.db` untuk memastikan koneksi tersedia
  if (!req.db) {
    console.error('Database connection not available in login route');
    return res.status(500).send('Database connection error.');
  }

  try {
    // Ganti db.queryAsync dengan req.db.query
    const [results] = await req.db.query('SELECT * FROM Users WHERE Username = ?', [username]); // <--- PERUBAHAN DI SINI!
    //                 ^^^^^^  Pastikan destructured array untuk mysql2/promise

    if (results.length === 0) {
      return res.status(401).send('Username tidak ditemukan');
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).send('Password salah');
    }

    req.session.user = {
      id: user.UserID,
      username: user.Username,
      email: user.Email,
      role: user.Role
    };
    // req.session.save(); // Biasanya tidak diperlukan jika hanya mengassign properti baru. express-session akan menyimpannya otomatis sebelum respons dikirim. Tapi jika ada redirect, terkadang perlu. Anda bisa coba tanpa ini dulu.

    return res.redirect(user.Role === 'admin' ? '/admin' : '/user');
  } catch (err) {
    console.error('Error in login process:', err); // Log error lebih detail
    return res.status(500).send('Terjadi kesalahan saat login');
  }
};
