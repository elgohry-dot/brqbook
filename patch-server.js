import fs from 'fs';
const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const oldExit = `app.listen(PORT, '0.0.0.0', () => {`;
const newExit = `process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {`;

if (code.includes(oldExit) && !code.includes('SIGTERM')) {
    code = code.replace(oldExit, newExit);
    fs.writeFileSync(serverFile, code);
    console.log('Patched server.ts with SIGTERM handler');
}
