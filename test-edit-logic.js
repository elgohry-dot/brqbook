import fs from 'fs';
const botFile = 'server/telegramBot.ts';
let code = fs.readFileSync(botFile, 'utf8');
if(code.includes('editMessageText')) {
    console.log('Edit message logic exists');
}
