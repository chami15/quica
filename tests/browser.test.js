// Teste de ponta a ponta no Chrome headless via DevTools Protocol (sem dependências).
// Uso: node tests/browser.test.js [pasta-de-screenshots]
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'quica-shots');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 9333;
const url = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'quica-prof-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=430,860', '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const errors = [];
function send(method, params) {
  return new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function click(sel) { await evalJs(`document.querySelector(${JSON.stringify(sel)}).click()`); await sleep(150); }
// espera a abertura sumir sozinha
async function passLoader(shotName) {
  if (shotName) { await sleep(500); await shot(shotName); }
  for (let i = 0; i < 60; i++) { await sleep(100); if (await evalJs(`document.getElementById('loader').hidden`)) break; }
  if (!(await evalJs(`document.getElementById('loader').hidden`))) errors.push('a abertura não sumiu sozinha');
  await sleep(200);
}
async function mouse(type, x, y) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 }); }

(async () => {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      target = list.find((t) => t.type === 'page');
    } catch (e) { /* aguardando o chrome */ }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id).res(d.result || {}); pending.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception.description);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value).join(' '));
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 860, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await passLoader('00-abertura');
  await shot('01-inicio');

  await click('.nav-btn[data-tab="balls"]'); await sleep(300); await shot('02-bolinhas');
  await click('.ball-cell[data-id="45"]'); await sleep(300); await shot('02b-bolinha-escolhida');
  await click('.ball-cell[data-id="56"]'); await sleep(200); await shot('02d-lendaria-micro');
  await click('.ball-cell[data-id="60"]'); await sleep(200); await shot('02e-especial-visual');
  await evalJs(`document.querySelector('.ball-cell[data-id="44"]').scrollIntoView()`); await sleep(200); await shot('02f-grade-lendarias');
  await click('.seg-tabs [data-sec="themes"]'); await sleep(250); await shot('02g-temas');
  await click('.theme-card[data-id="oceano"]'); await sleep(150); await shot('02h-tema-oceano');
  await click('.seg-tabs [data-sec="balls"]');
  await click('.nav-btn[data-tab="modes"]'); await shot('02c-modos-em-breve');
  await click('.nav-btn[data-tab="home"]');
  await click('#btn-help'); await sleep(300); await shot('03-guia'); await click('#pop-guide [data-close]');
  await click('#view-home .js-settings'); await sleep(300); await shot('03b-ajustes'); await click('#pop-settings [data-close]');
  await click('#btn-play'); await sleep(300); await shot('04-reforcos');
  await click('#btn-start'); await sleep(300); await shot('04b-carregando-partida'); await sleep(1300);
  await shot('05-jogo-inicio-tutorial');
  await click('.act[data-k="drill"]'); await sleep(250); await shot('05b-ferramenta-bloqueada');
  await evalJs(`document.getElementById('toast').hidden = true`);

  // mira e dispara arrastando o mouse
  const field = await evalJs(`(() => { const c = document.getElementById('cv').getBoundingClientRect(); return { w: c.width, h: c.height }; })()`);
  const tx = field.w * 0.35, ty = field.h * 0.35;
  await mouse('mousePressed', tx, ty);
  await mouse('mouseMoved', tx + 20, ty + 10);
  await sleep(200);
  await shot('06-mirando');
  await mouse('mouseReleased', tx + 20, ty + 10);
  await sleep(250);
  await shot('07-disparo');
  // espera o fim do turno
  for (let i = 0; i < 40; i++) { await sleep(250); if (await evalJs(`document.getElementById('hud-line').textContent`) !== '1') break; }
  const line = await evalJs(`document.getElementById('hud-line').textContent`);
  console.log('linha após 1º disparo:', line);
  if (line !== '2') errors.push('a linha não avançou após o disparo');

  // vários turnos com mira aleatória
  for (let t = 0; t < 12; t++) {
    const x = field.w * (0.15 + Math.random() * 0.7), y = field.h * (0.15 + Math.random() * 0.35);
    await mouse('mousePressed', x, y); await mouse('mouseMoved', x, y + 1); await mouse('mouseReleased', x, y + 1);
    for (let i = 0; i < 80; i++) {
      await sleep(150);
      const st = await evalJs(`(() => { const o = document.getElementById('pop-over'); return o.hidden ? 'ok' : 'over'; })()`);
      if (st === 'over') break;
      const recall = await evalJs(`!document.getElementById('btn-recall').hidden`);
      if (i === 40 && recall) await click('#btn-recall');
      const idle = await evalJs(`document.getElementById('btn-recall').hidden && document.getElementById('btn-speed').hidden`);
      if (idle && i > 3) break;
    }
    if (!(await evalJs(`document.getElementById('pop-over').hidden`))) break;
  }
  await shot('08-varios-turnos');
  console.log('linha final:', await evalJs(`document.getElementById('hud-line').textContent`));

  // força cenário avançado: linha 400 com blocos especiais (save injetado depois do reload)
  await send('Page.reload'); await passLoader();
  await evalJs(`(() => {
    const g = new QK.Game({ rng: Math.random });
    for (let i = 0; i < 400; i++) { g.moveDown(); g.addLine(); for (const e of [...g.elements]) if (e.row >= QK.ROWS - 4) g.removeElement(e); }
    g.balls = 120; g.rebuildGrid();
    localStorage.setItem('quica.save', JSON.stringify(g.serialize()));
    const s = JSON.parse(localStorage.getItem('quica.settings') || '{}'); s.longAim = true; s.ballId = 50;
    localStorage.setItem('quica.settings', JSON.stringify(s));
  })()`);
  await send('Page.reload'); await passLoader();
  const label = await evalJs(`document.getElementById('play-label').textContent`);
  console.log('botão principal com partida salva:', label);
  if (label !== 'Continuar') errors.push('o botão deveria mostrar Continuar');
  await shot('08b-inicio-continuar');
  await click('#btn-play'); await sleep(1700);
  await mouse('mousePressed', field.w * 0.7, field.h * 0.4); await mouse('mouseMoved', field.w * 0.7, field.h * 0.41);
  await sleep(200);
  await shot('09-linha400-mira-longa');
  await evalJs(`QK._ui.renderer.banner('Incrível!', '#ff5fa8', '9 blocos de uma vez'); QK._ui.renderer.burst(80)`);
  await sleep(350); await shot('09b-elogio-confete');
  await mouse('mouseReleased', field.w * 0.7, field.h * 0.41);
  await sleep(1500);
  await shot('10-linha400-disparo');
  await click('#btn-pause'); await sleep(300); await shot('11-pausa'); await click('#btn-resume');
  await click('#btn-pause'); await click('#btn-tohome'); await sleep(300); await shot('12-volta-inicio');

  // fim de jogo: bloco resistente prestes a tocar o chão
  await evalJs(`(() => {
    const g = new QK.Game({ rng: Math.random });
    for (let i = 0; i < 12; i++) { g.moveDown(); g.addLine(); }
    g.elements = g.elements.filter((e) => e.row < QK.ROWS - 1);
    for (const e of g.blocks()) { e.hp = e.maxHp = 999; }
    g.mk('normal', 0, QK.ROWS - 2, 999);
    g.rebuildGrid();
    localStorage.setItem('quica.save', JSON.stringify(g.serialize()));
  })()`);
  await send('Page.reload'); await passLoader();
  await click('#btn-play'); await sleep(1700);
  await mouse('mousePressed', field.w * 0.9, field.h * 0.3); await mouse('mouseReleased', field.w * 0.9, field.h * 0.3);
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    if (!(await evalJs(`document.getElementById('pop-over').hidden`))) break;
    if (i > 10 && !(await evalJs(`document.getElementById('btn-recall').hidden`))) await click('#btn-recall');
  }
  await sleep(400);
  await shot('13-fim-de-jogo');
  if (await evalJs(`document.getElementById('pop-over').hidden`)) errors.push('a tela de fim de jogo não apareceu');

  console.log('screenshots em', OUT);
  console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'OK - sem erros de JS');
  chrome.kill();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
