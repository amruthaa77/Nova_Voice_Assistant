const { spawn } = require('child_process');
const fs = require('fs');

const states = ['idle', 'listening', 'speaking', 'error'];
const artifactDir = 'C:\\Users\\amrut\\.gemini\\antigravity\\brain\\3a516a34-b78f-4fec-b9a9-013ed31b3ae5';

async function captureOne(state, port) {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const tempProfile = process.env.TEMP + '\\chrome_profile_' + state + '_' + Date.now();
  
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--window-size=1280,800',
    `--user-data-dir=${tempProfile}`,
    `http://127.0.0.1:5173/?state=${state}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const tabs = await listRes.json();
    const target = tabs.find(t => t.url.includes('5173')) || tabs[0];
    if (!target) throw new Error('No target tab found for ' + state);

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

    // Wait 3.5s for mascot to fully initialize, animate, and face texture to draw
    await new Promise(r => setTimeout(r, 3500));

    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const outPath = `${artifactDir}\\screenshot_${state}.png`;
    fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Successfully saved: screenshot_${state}.png`);

    ws.close();
  } finally {
    chrome.kill();
    await new Promise(r => setTimeout(r, 500));
  }
}

async function main() {
  let port = 9400;
  for (const s of states) {
    console.log(`Starting capture for state: ${s} on port ${port}...`);
    try {
      await captureOne(s, port++);
    } catch (e) {
      console.error(`Error capturing ${s}:`, e.message);
    }
  }
  console.log('ALL CAPTURES COMPLETED!');
}

main();
