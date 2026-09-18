import fs from 'fs';
const botFile = 'server/telegramBot.ts';
let code = fs.readFileSync(botFile, 'utf8');

// The issue might be that vite dev server restarts the file and creates multiple instances,
// or that poll() calls itself recursively and somehow spawns multiple chains.
// Let's add a strict check for isPolling in startPolling and poll

const oldStartPolling = `  public async startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;`;

const newStartPolling = `  private pollTimeout: NodeJS.Timeout | null = null;

  public async startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;`;

if (!code.includes('pollTimeout')) {
    code = code.replace(oldStartPolling, newStartPolling);
}

const oldPollEnd = `    // Immediately schedule next poll cycle
    setTimeout(() => this.poll(), 500);
  }`;

const newPollEnd = `    // Immediately schedule next poll cycle
    if (this.pollTimeout) clearTimeout(this.pollTimeout);
    this.pollTimeout = setTimeout(() => this.poll(), 500);
  }`;

if (!code.includes('this.pollTimeout = setTimeout')) {
    code = code.replace(oldPollEnd, newPollEnd);
}

fs.writeFileSync(botFile, code);
console.log('Patched poll timing logic');
