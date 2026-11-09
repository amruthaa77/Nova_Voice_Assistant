const { spawn } = require('child_process');

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9336;
  const tempProfile = process.env.TEMP + '\\chrome_diag_' + Date.now();
  
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--enable-webgl',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--window-size=1280,800',
    `--user-data-dir=${tempProfile}`,
    'http://127.0.0.1:5173'
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

    // Listen to console and exceptions
    ws.addEventListener('message', (evt) => {
      const data = JSON.parse(evt.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        const args = data.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
        console.log('[LOG]', data.params.type, args);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('[EXCEPTION]', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
      }
    });

    await send('Runtime.enable');
    await send('Page.enable');

    await new Promise(r => setTimeout(r, 2000));

    console.log('--- WAITING FOR BUTTON TO BE ENABLED ---');
    await send('Runtime.evaluate', {
      expression: `new Promise((resolve) => {
        const check = () => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Tap to talk'));
          if (btn && !btn.disabled) resolve(true);
          else setTimeout(check, 200);
        };
        check();
      })`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('--- CLICKING "TAP TO TALK" BUTTON ---');
    const clickRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Tap to talk'));
        if (btn) {
          btn.click();
          return 'CLICKED_BUTTON';
        }
        return 'BUTTON_NOT_FOUND';
      })()`,
      returnByValue: true
    });
    console.log('Click result:', clickRes.result?.value);

    // Wait 5 seconds to observe full network and session lifecycle
    await new Promise(r => setTimeout(r, 6000));

    const stateRes = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          bodyText: document.body.innerText,
        };
      })()`,
      returnByValue: true
    });
    console.log('Final Page Text:', stateRes.result?.value?.bodyText);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const fs = require('fs');
    fs.writeFileSync('C:/Users/amrut/.gemini/antigravity/brain/3a516a34-b78f-4fec-b9a9-013ed31b3ae5/screenshot_quota_limit.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshot_quota_limit.png');

    ws.close();
  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    chrome.kill();
  }
}

main();
