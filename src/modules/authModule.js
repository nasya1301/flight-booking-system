const bcrypt = require('bcrypt');
// const db = require('../config/db'); // Pastikan ini tetap dikomentari atau dihapus
/* eslint-disable no-console*/

exports.register = async (req, res) => {
    // ... (kode register Anda tetap sama)
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    console.log('LOGIN ATTEMPT: Received request for username:', username); // LOG 1

    // Tambahkan pengecekan `req.db` di sini juga, sebagai safeguard
    if (!req.db) {
        console.error('ERROR: Database connection not available in login route.');
        return res.status(500).send('Database connection error.');
    }

    try {
        console.log('LOGIN STEP 1: Querying database for user...'); // LOG 2
        const [results] = await req.db.query('SELECT * FROM Users WHERE Username = ?', [username]);
        console.log('LOGIN STEP 2: Database query complete. Results length:', results.length); // LOG 3

        if (results.length === 0) {
            console.log('LOGIN RESULT: Username not found.'); // LOG 4
            return res.status(401).send('Username tidak ditemukan');
        }

        const user = results[0];
        console.log('LOGIN STEP 3: User found. Username from DB:', user.Username); // LOG 5
        console.log('LOGIN DEBUG: Input Password (first 5 chars):', password ? password.substring(0, 5) + '...' : 'N/A'); // LOG 6 - HATI-HATI JANGAN LOG PASSWORD ASLI
        console.log('LOGIN DEBUG: Stored PasswordHash (first 5 chars):', user.PasswordHash ? user.PasswordHash.substring(0, 5) + '...' : 'N/A'); // LOG 7 - HATI-HATI JANGAN LOG HASH ASLI

        console.log('LOGIN STEP 4: Comparing passwords...'); // LOG 8
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        console.log('LOGIN STEP 5: bcrypt.compare result (isMatch):', isMatch); // LOG 9

        if (!isMatch) {
            console.log('LOGIN RESULT: Password mismatch.'); // LOG 10
            return res.status(401).send('Password salah');
        }

        console.log('LOGIN STEP 6: Password matched. Setting session...'); // LOG 11
        req.session.user = {
            id: user.UserID,
            username: user.Username,
            email: user.Email,
            role: user.Role
        };
        // console.log('LOGIN STEP 7: Session user set:', req.session.user.username); // LOG 12 (Opsional, jika ingin lihat data user di sesi)
        // req.session.save(); // Tetap bisa dihapus jika tidak ada masalah session

        console.log('LOGIN STEP 8: Redirecting...'); // LOG 13
        return res.redirect(user.Role === 'admin' ? '/admin' : '/user');
    } catch (err) {
        console.error('!!! LOGIN FAILED - FINAL CATCH ERROR:', err); // LOG ERROR UTAMA, GANTI PESANNYA BIAR JELAS DI LOG
        return res.status(500).send('Terjadi kesalahan saat login');
    }
};
