const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9340;
  const tempProfile = process.env.TEMP + '\\chrome_audit_' + Date.now();
  
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--enable-webgl',
    '--window-size=1920,1080',
    `--user-data-dir=${tempProfile}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:5173`, { method: 'PUT' });
    const tab = await listRes.json();
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise((resolve) => ws.onopen = resolve);
    await send('Page.enable');
    await send('DOM.enable');

    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 2500));

    const outDir = 'C:/Users/amrut/.gemini/antigravity/brain/3a516a34-b78f-4fec-b9a9-013ed31b3ae5/audit';

    const pages = ['Dashboard', 'Conversations', 'Analytics', 'AI Settings'];

    for (const pageName of pages) {
      // Open drawer
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('button[aria-label="Open navigation menu"]');
          if (btn) btn.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 400));

      // Click specific page link in drawer
      await send('Runtime.evaluate', {
        expression: `(() => {
          const drawer = document.querySelector('aside[aria-label="Mobile Navigation"]');
          if (drawer) {
            const btns = Array.from(drawer.querySelectorAll('button'));
            const target = btns.find(b => b.textContent && b.textContent.includes('${pageName}'));
            if (target) target.click();
          }
        })()`
      });
      await new Promise(r => setTimeout(r, 800));

      const overflow = await send('Runtime.evaluate', {
        expression: `(() => {
          const docEl = document.documentElement;
          const body = document.body;
          return {
            scrollWidth: docEl.scrollWidth,
            clientWidth: docEl.clientWidth,
            hasHorizontalOverflow: docEl.scrollWidth > docEl.clientWidth || body.scrollWidth > body.clientWidth
          };
        })()`,
        returnByValue: true
      });
      console.log(`Mobile 390px - Page: ${pageName}, overflow:`, overflow.result?.value);

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const safeName = pageName.toLowerCase().replace(/\s+/g, '_');
      fs.writeFileSync(path.join(outDir, `mobile_390_${safeName}.png`), Buffer.from(shot.data, 'base64'));
    }

    console.log('Finished capturing all mobile pages.');
    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chrome.kill();
  }
}

main();
