require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const express = require('express');
const app = express();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Error: Harap atur GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di file .env.local!");
  process.exit(1);
}
const PORT = 8085;
const REDIRECT_URI = `http://localhost:${PORT}`;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = ['https://www.googleapis.com/auth/drive'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes
});

app.get('/', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.send('Otorisasi gagal, tidak ada kode.');
    return;
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n==================================================');
    console.log('  OTORISASI BERHASIL!');
    console.log('==================================================');
    console.log('Masukkan token berikut sebagai variabel lingkungan (environment variable):\n');
    console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log(`GOOGLE_CLIENT_ID="${CLIENT_ID}"`);
    console.log(`GOOGLE_CLIENT_SECRET="${CLIENT_SECRET}"`);
    console.log('==================================================\n');
    
    res.send('<h1>Otorisasi Berhasil!</h1><p>Silakan kembali ke terminal Anda. Halaman ini aman untuk ditutup.</p>');
    
    // Graceful exit after sending response
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (err) {
    console.error('Error exchanging code:', err);
    res.send('Error exchanging code: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('  Dapatkan Google Refresh Token Anda');
  console.log('==================================================');
  console.log('Silakan klik link di bawah untuk melakukan otorisasi:');
  console.log(`\n${authUrl}\n`);
  console.log('Menunggu otorisasi...');
  console.log('==================================================\n');
});
