const { spawn } = require('child_process');
const fs = require('fs');

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9335;
  const tempProfile = process.env.TEMP + '\\chrome_final_' + Date.now();
  
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--window-size=1280,800',
    `--user-data-dir=${tempProfile}`,
    'http://127.0.0.1:5173/?state=idle'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const tabs = await listRes.json();
    const target = tabs.find(t => t.url.includes('5173')) || tabs[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    
    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise((resolve) => ws.onopen = resolve);
    await send('Runtime.enable');
    await send('Page.enable');

    await new Promise(r => setTimeout(r, 3500));

    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\amrut\\.gemini\\antigravity\\brain\\3a516a34-b78f-4fec-b9a9-013ed31b3ae5\\screenshot_idle.png', Buffer.from(screenshot.data, 'base64'));
    console.log('Saved screenshot_idle.png successfully!');
    ws.close();
  } finally {
    chrome.kill();
  }
}

main();
