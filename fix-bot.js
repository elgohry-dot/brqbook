import fs from 'fs';
const dbPath = './data/db.json';
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const token = db.settings.botToken;

if (!token) {
  console.log('No token found');
  process.exit(0);
}

async function run() {
  // Clear any existing webhooks on Telegram side
  console.log('Deleting webhook...');
  const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
  const data = await res.json();
  console.log('Delete webhook response:', data);
}

run();
