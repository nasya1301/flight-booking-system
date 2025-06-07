require('dotenv').config();
const app = require('./app');

if (require.main === module) {
  // Jika dijalankan langsung via `node server.js`, start server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
} else {
  // Jika di-import (misal oleh Vercel), export app saja
  module.exports = app;
}
