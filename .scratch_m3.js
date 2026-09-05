const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const dir = fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).sort().pop();
(async () => {
  const b = await chromium.launch({ executablePath: path.join('/opt/pw-browsers', dir, 'chrome-linux/chrome') });
  const p = await b.newPage({ viewport: { width: 412, height: 900 } });
  await p.goto('file://' + path.resolve('app.html'));
  await p.waitForTimeout(1700);
  const r = await p.evaluate(() => {
    navigate('browse');
    const coin = { id:'AY-00463-B', name:'Martha Washington First Spouse Gold $10', denom:'$10', year:2007, mint:'W', grade:'MS-69' };
    FAKE_COINS.push(coin); showBrowseDetail(coin);
    const tr = document.getElementById('browseDetailTR');
    const disc = document.getElementById('browseDetailDisc');
    const frame = document.getElementById('browseDetailFlipFrame');
    const lines = [...tr.querySelectorAll('.corner-line')].map(l => ({ text:l.textContent, r:l.getBoundingClientRect() }));
    const d = disc.getBoundingClientRect(), f = frame.getBoundingClientRect(), t = tr.getBoundingClientRect();
    // circle geometry: does the last line's bottom-left corner fall inside the circle?
    const cx = d.left + d.width/2, cy = d.top + d.height/2, rad = d.width/2;
    const hits = lines.map(l => {
      // check the label box's closest point to circle center
      const nx = Math.max(l.r.left, Math.min(cx, l.r.right));
      const ny = Math.max(l.r.top, Math.min(cy, l.r.bottom));
      const dist = Math.hypot(nx-cx, ny-cy);
      return { text:l.text, dist: +dist.toFixed(1), rad:+rad.toFixed(1), overlapsCircle: dist < rad, bottom:+l.r.bottom.toFixed(1) };
    });
    FAKE_COINS.pop();
    return { fontSize:getComputedStyle(tr).fontSize, trBox:{top:+t.top.toFixed(1),bottom:+t.bottom.toFixed(1),h:+t.height.toFixed(1)},
             discTop:+d.top.toFixed(1), frameTop:+f.top.toFixed(1), clearance:+(d.top-f.top).toFixed(1), hits };
  });
  console.log(JSON.stringify(r,null,2));
  await b.close();
})();
