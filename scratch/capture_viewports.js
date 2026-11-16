const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9338;
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

    await new Promise(r => setTimeout(r, 2500));

    const viewports = [
      { name: 'desktop_1920', width: 1920, height: 1080 },
      { name: 'desktop_1440', width: 1440, height: 900 },
      { name: 'laptop_1366', width: 1366, height: 768 },
      { name: 'laptop_1280', width: 1280, height: 800 },
      { name: 'tablet_landscape_1024', width: 1024, height: 768 },
      { name: 'tablet_portrait_768', width: 768, height: 1024 },
      { name: 'mobile_430', width: 430, height: 932 },
      { name: 'mobile_390', width: 390, height: 844 },
      { name: 'mobile_375', width: 375, height: 667 },
      { name: 'mobile_320', width: 320, height: 568 },
    ];

    const outDir = 'C:/Users/amrut/.gemini/antigravity/brain/3a516a34-b78f-4fec-b9a9-013ed31b3ae5/audit';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const auditResults = [];

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 768
      });
      await new Promise(r => setTimeout(r, 1000));

      // Measure layout overflow
      const metrics = await send('Runtime.evaluate', {
        expression: `(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const overflowX = docEl.scrollWidth > docEl.clientWidth || body.scrollWidth > body.clientWidth;
          
          // Find any elements sticking out
          const overflowing = [];
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > window.innerWidth + 1) {
              overflowing.push({
                tag: el.tagName,
                class: el.className ? String(el.className).substring(0, 50) : '',
                right: rect.right,
                windowWidth: window.innerWidth
              });
            }
          });

          return {
            scrollWidth: docEl.scrollWidth,
            clientWidth: docEl.clientWidth,
            hasHorizontalOverflow: overflowX,
            overflowingCount: overflowing.length,
            overflowingSample: overflowing.slice(0, 3)
          };
        })()`,
        returnByValue: true
      });

      const res = metrics.result?.value;
      console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): overflow=${res.hasHorizontalOverflow}`, res);
      auditResults.push({ vp: vp.name, ...res });

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `${vp.name}_assistant.png`), Buffer.from(shot.data, 'base64'));
    }

    // Now test opening mobile navigation on mobile_390
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 500));

    // Click hamburger button
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[aria-label="Open navigation menu"]');
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    const shotNav = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `mobile_390_nav_open.png`), Buffer.from(shotNav.data, 'base64'));
    console.log('Saved mobile_390_nav_open.png');

    // Click Dashboard link to test secondary page
    await send('Runtime.evaluate', {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('aside button'));
        const dashboardBtn = links.find(b => b.textContent && b.textContent.includes('Dashboard'));
        if (dashboardBtn) dashboardBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    const shotDashboard = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `mobile_390_dashboard.png`), Buffer.from(shotDashboard.data, 'base64'));
    console.log('Saved mobile_390_dashboard.png');

    // Check overflow on Dashboard
    const dashMetrics = await send('Runtime.evaluate', {
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
    console.log('Mobile Dashboard overflow check:', dashMetrics.result?.value);

    // Desktop 1440 Dashboard screenshot
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise(r => setTimeout(r, 800));
    const shotDesktopDash = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `desktop_1440_dashboard.png`), Buffer.from(shotDesktopDash.data, 'base64'));
    console.log('Saved desktop_1440_dashboard.png');

    console.log('\nAll audit screenshots and checks completed successfully.');
    ws.close();
  } catch (err) {
    console.error('Audit capture error:', err);
  } finally {
    chrome.kill();
  }
}

main();
