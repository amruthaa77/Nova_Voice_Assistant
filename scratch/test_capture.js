const { spawn } = require('child_process');
const fs = require('fs');

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9333;
  const tempProfile = process.env.TEMP + '\\chrome_test_profile_' + Date.now();
  
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--window-size=1280,800',
    `--user-data-dir=${tempProfile}`,
    'http://127.0.0.1:5173?state=idle'
  ]);

  // Wait for Chrome to start
  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const tabs = await listRes.json();
    console.log('Tabs:', tabs.map(t => ({ title: t.title, url: t.url, ws: t.webSocketDebuggerUrl })));
    const target = tabs.find(t => t.url.includes('5173')) || tabs[0];
    if (!target) throw new Error('No target tab found');

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

    // Enable console & runtime
    ws.addEventListener('message', (evt) => {
      const data = JSON.parse(evt.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => JSON.stringify(a.value || a.description)).join(' '));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
      }
    });

    await send('Runtime.enable');
    await send('Console.enable');
    await send('Page.enable');

    // Wait 3 seconds for page render
    await new Promise(r => setTimeout(r, 3000));

    // Check canvas element in DOM
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvases = document.querySelectorAll('canvas');
        return {
          canvasesCount: canvases.length,
          canvasSizes: Array.from(canvases).map(c => ({
            w: c.width,
            h: c.height,
            clientWidth: c.clientWidth,
            clientHeight: c.clientHeight,
            style: c.style.cssText
          })),
          bodyHtmlSubstr: document.body.innerHTML.substring(0, 300)
        };
      })()`,
      returnByValue: true
    });
    console.log('DOM Evaluation:', JSON.stringify(evalRes.result?.value, null, 2));

    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\amrut\\.gemini\\antigravity\\brain\\3a516a34-b78f-4fec-b9a9-013ed31b3ae5\\screenshot_idle.png', Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot captured and saved!');

    ws.close();
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    chrome.kill();
  }
}

main();
