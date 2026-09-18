import fs from 'fs';
const botFile = 'server/telegramBot.ts';
let code = fs.readFileSync(botFile, 'utf8');

const oldExport = `export const telegramBot = new TelegramBotService();`;
const newExport = `// Prevent multiple instances in development due to module reloading
const globalForBot = global as unknown as { telegramBot: TelegramBotService };
export const telegramBot = globalForBot.telegramBot || new TelegramBotService();
if (process.env.NODE_ENV !== 'production') globalForBot.telegramBot = telegramBot;`;

if(code.includes(oldExport)) {
    code = code.replace(oldExport, newExport);
    fs.writeFileSync(botFile, code);
    console.log('Patched export logic for singleton');
} else {
    console.log('Already patched or not found');
}
