// Simulação headless: joga partidas inteiras com mira aleatória e valida invariantes.
// Uso: node tests/sim.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, JSON, Set, Map, Array, Object };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['data.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx);
const QK = ctx.QK;

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

let failures = 0;
const assert = (c, msg) => { if (!c) { failures++; console.error('FALHOU:', msg); } };

// 1) RandBlockCount respeita limites
{
  const g = new QK.Game({ rng: seeded(1) });
  for (let L = 1; L < 2000; L += 7) {
    const n = g.randBlockCount(L, 7);
    assert(n >= 1 && n <= 6, `randBlockCount fora do intervalo: L=${L} n=${n}`);
  }
}

// golpe só conta com a bola indo contra o bloco (evita dano duplicado)
let awayHits = 0;
{
  const orig = QK.Game.prototype.hitBlock;
  QK.Game.prototype.hitBlock = function (e, b, c) {
    if (b.vx * c.nx + b.vy * c.ny >= 0) awayHits++;
    return orig.call(this, e, b, c);
  };
}

// 2) partidas completas
const events = {};
let maxLine = 0;
for (let seed = 1; seed <= 12; seed++) {
  const g = new QK.Game({
    rng: seeded(seed), ballId: [1, 39, 44, 45, 49, 50, 55, 35, 56, 36, 53, 1][seed - 1],
    boosters: { addball: seed % 2 === 0, rocket: seed % 3 === 0, blackhole: seed % 4 === 0 },
  });
  g.on((t) => { events[t] = (events[t] || 0) + 1; });
  // começa direto numa linha alta para exercitar os blocos especiais
  if (seed > 6) { for (let i = 0; i < 300; i++) { g.moveDown(); g.addLine(); for (const e of g.blocks()) if (e.row >= QK.ROWS - 3) g.removeElement(e); } g.balls = 300; g.rebuildGrid(); }
  const rng = seeded(seed * 99);
  let turns = 0, continues = 0;
  while (turns < 400) {
    if (g.state === 'over') {
      if (continues < 2 && g.doContinue(true) || (g.wallet = 1000, continues < 2 && g.doContinue(false))) { continues++; continue; }
      break;
    }
    assert(g.state === 'aim', 'estado deveria ser aim');
    if (g.actionsUnlocked() && rng() < 0.1) g.useAction(['pad', 'drill', 'hline', 'super'][Math.floor(rng() * 4)]);
    const a = (0.15 + rng() * 0.7) * Math.PI;
    g.aimPath({ x: Math.cos(a), y: Math.sin(a) }, 3);
    g.shoot({ x: Math.cos(a), y: Math.sin(a) });
    let t = 0;
    while (g.state === 'shoot' && t < 120) {
      g.update(1 / 60); t += 1 / 60;
      if (t > 20) g.speedUp();
      if (t > 40) g.recall();
      for (const b of g.flying) {
        assert(b.x >= QK.LEFT - 0.01 && b.x <= QK.RIGHT + 0.01 && b.y >= QK.GROUND - 1 && b.y <= QK.TOP + 0.01, `bola fora do campo ${b.x},${b.y}`);
        assert(Number.isFinite(b.vx) && Number.isFinite(b.vy), 'velocidade inválida');
      }
    }
    assert(g.state !== 'shoot', `turno travado (seed ${seed}, linha ${g.line})`);
    assert(g.availableBalls >= 1, 'jogador ficou sem bolas');
    assert(g.prisonLocked >= 0, 'prisonLocked negativo');
    // grade consistente
    for (const e of g.elements) for (const [c, r] of g.cellsOf(e)) if (r >= 0) assert(g.at(c, r) === e, `grade inconsistente ${e.type}`);
    // save/load
    if (turns % 25 === 0) { const s = g.serialize(); g.load(s); assert(g.serialize() === s, 'save/load mudou o estado'); }
    turns++;
  }
  maxLine = Math.max(maxLine, g.line);
  console.log(`seed ${seed}: linha ${g.line}, bolas ${g.balls}, estado ${g.state}, moedas ${g.wallet}`);
}
console.log('eventos:', JSON.stringify(events));
const types = new Set();
{
  const g = new QK.Game({ rng: seeded(5) });
  for (let i = 0; i < 1200; i++) { g.moveDown(); g.addLine(); for (const e of g.elements) types.add(e.type); for (const e of [...g.elements]) if (e.row >= QK.ROWS - 2) g.removeElement(e); }
}
console.log('tipos gerados até a linha 1200:', [...types].sort().join(', '));
assert(types.size >= 22, 'nem todos os tipos de bloco/itens foram gerados');
for (const ev of ['hit', 'break', 'plus', 'laser', 'launch', 'gameover']) assert(events[ev] > 0, `evento ${ev} nunca ocorreu`);
assert(awayHits === 0, `${awayHits} golpe(s) com a bola se afastando do bloco (dano duplicado)`);
console.log(failures ? `${failures} falha(s)` : 'OK - todos os testes passaram');
process.exit(failures ? 1 : 0);
