// Núcleo do jogo: regras, geração de linhas e física das bolas.
// Não usa DOM, então roda tanto no navegador quanto no Node (testes).
(function (root) {
  const QK = root.QK;
  const V = QK.V;
  const { CELL, COLS, ROWS, LEFT, RIGHT, TOP, GROUND } = QK;
  const SPAWN_ROW = 1;
  const STEP = 1 / 240;
  const RETURN_SPEED = 160;
  const MIN_VY_RATIO = 0.06; // evita bola presa na horizontal

  const key = (c, r) => r * COLS + c;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  class Game {
    constructor(opts) {
      this.opts = Object.assign({
        ballId: 1,
        boosters: { addball: false, rocket: false, blackhole: false },
        specials: true,
        actionCharges: 3,      // usos de cada item ativo por partida (-1 = infinito)
        longAim: false,
        wallet: 0,
        rng: Math.random,
      }, opts || {});
      this.rng = this.opts.rng;
      this.listeners = [];
      this.wallet = this.opts.wallet;
      this.newGame();
    }

    on(fn) { this.listeners.push(fn); }
    emit(type, data) { for (const l of this.listeners) l(type, data || {}); }

    // ------------------------------------------------------------------ setup
    newGame() {
      this.line = 0;
      this.turn = 0;
      this.balls = 1 + (this.opts.boosters.addball ? V.bonusBalls : 0);
      this.launchX = 0;
      this.elements = [];
      this.grid = new Map();
      this.nextId = 1;
      this.share = { hp: 0, max: 0 };
      this.continues = 0;
      this.freeContinueUsed = false;
      const n = this.opts.actionCharges;
      this.charges = { pad: n, drill: n, hline: n, super: n };
      this.prisonLocked = 0;
      this.flying = [];
      this.greens = [];
      this.pad = null;
      this.superShot = false;
      this.state = 'aim';
      this.timeScale = 1;
      this.time = 0;
      this.acc = 0;
      this.best = 0;
      this.addLine();
    }

    get availableBalls() { return this.balls - this.prisonLocked; }
    get skin() { return QK.ballById(this.opts.ballId); }
    actionsUnlocked() { return this.line >= V.toolsUnlockLine; }

    // ----------------------------------------------------------- elementos
    cellsOf(e) {
      if (e.big) return [[e.col, e.row], [e.col + 1, e.row], [e.col, e.row - 1], [e.col + 1, e.row - 1]];
      return [[e.col, e.row]];
    }
    rebuildGrid() {
      this.grid.clear();
      for (const e of this.elements) for (const [c, r] of this.cellsOf(e)) this.grid.set(key(c, r), e);
    }
    at(c, r) { return this.grid.get(key(c, r)); }
    isFree(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS && !this.grid.has(key(c, r)); }

    center(e) {
      let x = LEFT + CELL * (e.col + 0.5);
      let y = TOP - CELL * (e.row + 0.5);
      if (e.big) { x += CELL / 2; y += CELL / 2; }
      return { x, y };
    }
    half(e) { return e.big ? CELL + QK.BLOCK_HALF - CELL / 2 : QK.BLOCK_HALF; }

    // vértices em ordem anti-horária
    poly(e) {
      const { x, y } = this.center(e);
      const h = this.half(e);
      const c = [[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h]];
      if (e.tri == null) return c;
      // e.tri = canto do ângulo reto; remove o canto oposto
      const skip = (e.tri + 2) % 4;
      return c.filter((_, i) => i !== skip);
    }

    mk(type, col, row, hp, extra) {
      const e = Object.assign({
        id: this.nextId++, kind: 'block', type, col, row, hp, maxHp: hp, tri: null,
        visRow: row - 1, spawnTurn: this.turn,
      }, extra || {});
      this.elements.push(e);
      for (const [c, r] of this.cellsOf(e)) this.grid.set(key(c, r), e);
      return e;
    }
    mkItem(type, col, row) {
      const e = { id: this.nextId++, kind: 'item', type, col, row, used: false, visRow: row - 1 };
      this.elements.push(e);
      this.grid.set(key(col, row), e);
      return e;
    }
    removeElement(e) {
      const i = this.elements.indexOf(e);
      if (i >= 0) this.elements.splice(i, 1);
      for (const [c, r] of this.cellsOf(e)) if (this.grid.get(key(c, r)) === e) this.grid.delete(key(c, r));
    }
    blocks() { return this.elements.filter((e) => e.kind === 'block'); }

    // ---------------------------------------------------------- geração
    // quantos blocos nascem numa linha: 1 garantido + sorteios com chance decrescente
    randBlockCount(line, avail) {
      const p = [1 + V.densityPerLine * (line - 1)];
      while (p.length + 1 < avail) p.push(V.densityFalloff * p[p.length - 1]);
      let count = 1;
      for (let i = 1; i < p.length; i++) {
        let v = p[i];
        if (v > V.densityReset) v = 1;
        else if (v > V.densityCap) v = V.densityCap;
        if (this.rng() < v) count++;
      }
      return count;
    }

    pickWeighted(list) {
      const total = list.reduce((s, x) => s + x.per, 0);
      let r = this.rng() * total;
      for (const x of list) { r -= x.per; if (r < 0) return x; }
      return list[list.length - 1];
    }

    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    addLine() {
      this.line++;
      const L = this.line;
      const row = SPAWN_ROW;
      const free = this.shuffle([...Array(COLS).keys()].filter((c) => this.isFree(c, row)));
      if (!free.length) return;
      const plusCol = free.pop();
      this.mkItem('plus', plusCol, row);
      const n = Math.min(this.randBlockCount(L, free.length + 1), free.length);
      const hp = QK.lineHp(L);
      const blockCols = free.splice(0, n);
      const eligible = this.opts.specials ? QK.SPECIAL.filter((s) => s.cond <= L) : [];
      let specials = 0;
      for (const col of blockCols) {
        if (!this.isFree(col, row)) continue; // ocupado por bloco gigante desta linha
        let placed = false;
        if (eligible.length && specials < V.maxSpecialsPerRow && this.rng() < V.specialRate) {
          placed = this.placeSpecial(this.pickWeighted(eligible), col, row, hp, free);
          if (placed) specials++;
        }
        if (!placed) this.placeNormal(col, row, hp);
      }
      // itens de ajuda e moedas nos espaços vazios restantes
      const empties = free.filter((c) => this.isFree(c, row));
      if (empties.length && this.rng() < V.helperRate) {
        const h = this.pickWeighted(QK.HELP);
        this.mkItem(h.key, empties.pop(), row);
      }
      if (empties.length && this.rng() < V.coinRate) this.mkItem('coin', empties.pop(), row);
    }

    placeNormal(col, row, hp) {
      if (this.rng() < V.triangleRate) return this.mk('normal', col, row, hp, { tri: Math.floor(this.rng() * 4) });
      return this.mk('normal', col, row, hp);
    }

    placeSpecial(sp, col, row, lineHp, free) {
      const hp = Math.max(1, Math.round(lineHp * sp.hp));
      switch (sp.key) {
        case 'Big': {
          const c2 = col + 1;
          const ok = c2 < COLS && free.includes(c2) && this.isFree(c2, row) && this.isFree(col, row - 1) && this.isFree(c2, row - 1);
          if (!ok) return false;
          free.splice(free.indexOf(c2), 1);
          this.mk('Big', col, row, hp, { big: true });
          return true;
        }
        case 'LockKey': {
          const kc = free.find((c) => this.isFree(c, row));
          if (kc == null) return false;
          free.splice(free.indexOf(kc), 1);
          const keyB = this.mk('Key', kc, row, hp);
          this.mk('Lock', col, row, hp, { keyId: keyB.id });
          return true;
        }
        case 'Share':
          this.share.hp += hp; this.share.max += hp;
          this.mk('Share', col, row, hp);
          return true;
        case 'Shield': return !!this.mk('Shield', col, row, hp, { sides: this.randomSides(1, true) });
        case 'Shield2': return !!this.mk('Shield', col, row, hp, { sides: this.randomSides(2) });
        case 'Shield3': return !!this.mk('Shield', col, row, hp, { sides: this.randomSides(3) });
        case 'Bubble': return !!this.mk('Bubble', col, row, hp, { bubble: true, bubbleT: 0 });
        case 'Ice': return !!this.mk('Ice', col, row, hp, { ice: 2 });
        case 'Transparent': return !!this.mk('Transparent', col, row, hp, { invisible: false });
        case 'Prison': return !!this.mk('Prison', col, row, hp, { locked: 0 });
        case 'Rotation': return !!this.mk('Rotation', col, row, hp, { tri: Math.floor(this.rng() * 4) });
        default: return !!this.mk(sp.key, col, row, hp);
      }
    }

    // sides = [cima, direita, baixo, esquerda] invencíveis
    randomSides(n, bottomOnly) {
      if (bottomOnly) return [false, false, true, false];
      const idx = this.shuffle([0, 1, 2, 3]).slice(0, n);
      return [0, 1, 2, 3].map((i) => idx.includes(i));
    }

    // -------------------------------------------------------------- mira
    clampDir(dx, dy) {
      let a = Math.atan2(dy, dx);
      const min = V.minAngleDeg * Math.PI / 180;
      if (a < 0) a = dx >= 0 ? min : Math.PI - min; // apontando para baixo
      a = clamp(a, min, Math.PI - min);
      return { x: Math.cos(a), y: Math.sin(a) };
    }

    // Trajetória prevista (linha de mira / mira longa)
    aimPath(dir, bounces) {
      const r = QK.BALL_R * this.skin.size;
      let x = this.launchX, y = GROUND + r, vx = dir.x, vy = dir.y;
      const pts = [{ x, y }];
      let hits = 0;
      const h = r * 0.6;
      for (let i = 0; i < 6000 && hits < bounces; i++) {
        x += vx * h; y += vy * h;
        let bounced = false;
        if (x - r < LEFT) { x = LEFT + r; vx = Math.abs(vx); bounced = true; }
        else if (x + r > RIGHT) { x = RIGHT - r; vx = -Math.abs(vx); bounced = true; }
        if (y + r > TOP) { y = TOP - r; vy = -Math.abs(vy); bounced = true; }
        if (y - r < GROUND && vy < 0) { pts.push({ x, y: GROUND + r }); return pts; }
        const c = this.collide(x, y, r, true);
        if (c) {
          x += c.nx * c.pen; y += c.ny * c.pen;
          const d = vx * c.nx + vy * c.ny;
          if (d < 0) { vx -= 2 * d * c.nx; vy -= 2 * d * c.ny; }
          bounced = true;
        }
        if (bounced) { pts.push({ x, y }); hits++; }
      }
      pts.push({ x, y });
      return pts;
    }

    // --------------------------------------------------------- colisões
    collidePoly(px, py, r, v) {
      let inside = true, best = Infinity, bx = 0, by = 0, bnx = 0, bny = 0, edgeBest = Infinity, enx = 0, eny = 0;
      for (let i = 0; i < v.length; i++) {
        const a = v[i], b = v[(i + 1) % v.length];
        const ex = b[0] - a[0], ey = b[1] - a[1];
        const len = Math.hypot(ex, ey);
        const cross = ex * (py - a[1]) - ey * (px - a[0]);
        if (cross < 0) inside = false;
        const lineDist = cross / len; // distância (com sinal) até a reta da aresta
        if (lineDist < edgeBest) { edgeBest = lineDist; enx = ey / len; eny = -ex / len; }
        let t = ((px - a[0]) * ex + (py - a[1]) * ey) / (len * len);
        t = clamp(t, 0, 1);
        const cx = a[0] + t * ex, cy = a[1] + t * ey;
        const d2 = (px - cx) ** 2 + (py - cy) ** 2;
        if (d2 < best) { best = d2; bx = cx; by = cy; bnx = ey / len; bny = -ex / len; }
      }
      if (inside) return { nx: enx, ny: eny, pen: r + edgeBest };
      const d = Math.sqrt(best);
      if (d >= r) return null;
      if (d < 1e-6) return { nx: bnx, ny: bny, pen: r };
      return { nx: (px - bx) / d, ny: (py - by) / d, pen: r - d };
    }

    // bloco mais penetrado nas células vizinhas da bola
    collide(x, y, r, preview) {
      const c0 = Math.floor((x - LEFT) / CELL), r0 = Math.floor((TOP - y) / CELL);
      let best = null;
      const seen = new Set();
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const e = this.at(c0 + dc, r0 + dr);
        if (!e || e.kind !== 'block' || seen.has(e)) continue;
        seen.add(e);
        if (e.type === 'Transparent' && e.invisible) continue;
        const res = this.collidePoly(x, y, r, this.poly(e));
        if (res && (!best || res.pen > best.pen)) { best = res; best.e = e; }
      }
      if (best && preview) return best;
      return best;
    }

    // ------------------------------------------------------------- disparo
    shoot(dir) {
      if (this.state !== 'aim') return false;
      this.dir = this.clampDir(dir.x, dir.y);
      this.state = 'shoot';
      this.toLaunch = this.availableBalls;
      this.launchTimer = V.launchIntervalMs / 1000;
      this.nextX = null;
      this.shootTime = 0;
      this.pendingPlus = 0;
      this.pendingRelease = 0;
      this.returned = 0;
      this.timeScale = 1;
      this.emit('shoot');
      return true;
    }

    launchOne() {
      let skin = this.skin;
      if (skin.ability === 'all') {
        const pool = QK.BALLS.filter((b) => b.ability !== 'all');
        skin = pool[Math.floor(this.rng() * pool.length)];
      }
      let { x: dx, y: dy } = this.dir;
      if (skin.ability === 'ninja') {
        const a = Math.atan2(dy, dx) + (this.rng() - 0.5) * 0.14;
        const c = this.clampDir(Math.cos(a), Math.sin(a));
        dx = c.x; dy = c.y;
      }
      const speed = V.ballSpeed * (skin.ability === 'speed' ? 1.8 : 1);
      const r = QK.BALL_R * skin.size;
      this.flying.push({
        x: this.launchX, y: GROUND + r, vx: dx * speed, vy: dy * speed, speed, r, skin,
        phase: 'fly', inItems: new Set(), moveCd: 0, superBall: this.superShot,
      });
      this.emit('launch');
    }

    recall() {
      if (this.state !== 'shoot') return;
      this.returned += this.toLaunch;
      this.toLaunch = 0;
      const tx = this.nextX != null ? this.nextX : this.launchX;
      for (const b of this.flying) if (b.phase === 'fly') { b.phase = 'recall'; b.tx = tx; }
      this.emit('recall');
    }

    speedUp() {
      if (this.state !== 'shoot') return;
      this.timeScale = this.timeScale === 1 ? 2 : V.fastForward;
    }

    // --------------------------------------------------------------- loop
    update(dt) {
      if (this.state !== 'shoot') return;
      this.acc += Math.min(dt, 0.1) * this.timeScale;
      while (this.acc >= STEP && this.state === 'shoot') {
        this.acc -= STEP;
        this.step(STEP);
      }
    }

    step(dt) {
      this.time += dt;
      this.shootTime += dt;
      if (this.toLaunch > 0) {
        this.launchTimer += dt;
        const iv = V.launchIntervalMs / 1000;
        while (this.toLaunch > 0 && this.launchTimer >= iv) {
          this.launchTimer -= iv;
          this.toLaunch--;
          this.launchOne();
        }
      }
      for (const b of this.flying) this.stepBall(b, dt);
      for (const g of this.greens) this.stepGreen(g, dt);
      this.flying = this.flying.filter((b) => b.phase !== 'done');
      this.greens = this.greens.filter((g) => !g.done);
      if (this.toLaunch === 0 && this.flying.length === 0 && this.greens.length === 0) this.endTurn();
    }

    landX() { return this.nextX != null ? this.nextX : this.launchX; }

    stepBall(b, dt) {
      if (b.phase === 'return' || b.phase === 'recall') {
        const tx = b.phase === 'recall' ? b.tx : this.landX();
        const ty = GROUND + b.r;
        const sp = b.phase === 'recall' ? V.ballSpeed * V.recallSpeed * 0.4 : RETURN_SPEED;
        const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
        if (d <= sp * dt) {
          if (b.phase === 'recall' && this.nextX == null) this.nextX = tx;
          b.phase = 'done'; this.returned++;
        }
        else { b.x += dx / d * sp * dt; b.y += dy / d * sp * dt; }
        return;
      }
      if (b.phase !== 'fly') return;
      b.moveCd -= dt;
      const n = Math.max(1, Math.ceil(b.speed * dt / (b.r * 0.45)));
      const h = dt / n;
      for (let i = 0; i < n && b.phase === 'fly'; i++) this.subStep(b, h);
    }

    subStep(b, h) {
      b.x += b.vx * h; b.y += b.vy * h;
      if (b.x - b.r < LEFT) { b.x = LEFT + b.r; b.vx = Math.abs(b.vx); }
      else if (b.x + b.r > RIGHT) { b.x = RIGHT - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y + b.r > TOP) { b.y = TOP - b.r; b.vy = -Math.abs(b.vy); }
      if (b.y - b.r <= GROUND && b.vy < 0) {
        if (this.pad && b.x >= this.pad.x0 && b.x <= this.pad.x1) {
          b.y = GROUND + b.r; b.vy = Math.abs(b.vy);
          this.emit('pad');
        } else {
          this.land(b);
          return;
        }
      }
      for (let k = 0; k < 2; k++) {
        const c = this.collide(b.x, b.y, b.r);
        if (!c) break;
        // só é batida se a bola vai contra o bloco; se já está se afastando, apenas desencosta
        if (b.vx * c.nx + b.vy * c.ny >= 0) { b.x += c.nx * (c.pen + 1e-6); b.y += c.ny * (c.pen + 1e-6); break; }
        const res = this.hitBlock(c.e, b, c);
        if (b.phase !== 'fly') return;
        if (res === 'pass') break;
        b.x += c.nx * c.pen; b.y += c.ny * c.pen;
        const d = b.vx * c.nx + b.vy * c.ny;
        if (d < 0) { b.vx -= 2 * d * c.nx; b.vy -= 2 * d * c.ny; }
        if (res === 'spread') this.randomizeDir(b);
      }
      // a correção de colisão pode empurrar a bola para dentro da parede
      if (b.x - b.r < LEFT) { b.x = LEFT + b.r; b.vx = Math.abs(b.vx); }
      else if (b.x + b.r > RIGHT) { b.x = RIGHT - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y + b.r > TOP) { b.y = TOP - b.r; b.vy = -Math.abs(b.vy); }
      this.fixHorizontal(b);
      this.checkItems(b);
    }

    fixHorizontal(b) {
      const min = b.speed * MIN_VY_RATIO;
      if (Math.abs(b.vy) < min) {
        b.vy = b.vy >= 0 ? -min : -min;
        const s = Math.hypot(b.vx, b.vy);
        b.vx *= b.speed / s; b.vy *= b.speed / s;
      }
    }

    randomizeDir(b) {
      let a;
      do { a = this.rng() * Math.PI * 2; } while (Math.abs(Math.sin(a)) < 0.25);
      b.vx = Math.cos(a) * b.speed; b.vy = Math.sin(a) * b.speed;
    }

    land(b) {
      b.y = GROUND + b.r;
      if (this.nextX == null) {
        this.nextX = clamp(b.x, LEFT + QK.BALL_R, RIGHT - QK.BALL_R);
        b.x = this.nextX;
        this.emit('firstLand', { x: this.nextX });
      }
      b.phase = 'return';
    }

    checkItems(b) {
      const c0 = Math.floor((b.x - LEFT) / CELL), r0 = Math.floor((TOP - b.y) / CELL);
      const now = new Set();
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const e = this.at(c0 + dc, r0 + dr);
        if (!e || e.kind !== 'item') continue;
        const p = this.center(e);
        if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < (QK.ITEM_R + b.r) ** 2) {
          now.add(e.id);
          if (!b.inItems.has(e.id)) this.triggerItem(e, b);
        }
      }
      b.inItems = now;
    }

    triggerItem(e, b) {
      const p = this.center(e);
      switch (e.type) {
        case 'plus':
          this.removeElement(e);
          this.pendingPlus++;
          this.greens.push({ x: p.x, y: p.y, vy: 0, done: false, landed: false });
          this.emit('plus', p);
          break;
        case 'coin': {
          this.removeElement(e);
          const v = V.coinValue * (b.skin.ability === 'coin' ? 2 : 1);
          this.wallet += v;
          this.emit('coin', { x: p.x, y: p.y, v });
          break;
        }
        case 'vlaser': e.used = true; this.laserCol(e.col, p); break;
        case 'hlaser': e.used = true; this.laserRow(e.row, p); break;
        case 'spread': e.used = true; this.randomizeDir(b); this.emit('spread', p); break;
      }
    }

    stepGreen(g, dt) {
      if (!g.landed) {
        g.vy -= 600 * dt;
        g.y += g.vy * dt;
        if (g.y <= GROUND + QK.BALL_R) { g.y = GROUND + QK.BALL_R; g.landed = true; }
        return;
      }
      if (this.nextX == null && (this.toLaunch > 0 || this.flying.length)) return; // espera a 1ª bola cair
      const tx = this.landX();
      const d = tx - g.x;
      if (Math.abs(d) <= RETURN_SPEED * dt) g.done = true;
      else g.x += Math.sign(d) * RETURN_SPEED * dt;
    }

    // ------------------------------------------------------------- dano
    hitSide(e, c) {
      if (Math.abs(c.nx) > Math.abs(c.ny)) return c.nx > 0 ? 1 : 3;
      return c.ny > 0 ? 0 : 2;
    }

    hitBlock(e, b, c) {
      if (b.superBall) { this.destroy(e, b); return 'bounce'; }
      const side = e.tri == null ? this.hitSide(e, c) : -1;
      if (e.type === 'Shield' && side >= 0 && e.sides[side]) { this.emit('clank', { e }); return 'bounce'; }
      if (e.type === 'Lock' && this.elements.some((k) => k.id === e.keyId)) { this.emit('clank', { e }); return 'bounce'; }
      if (e.type === 'Ice' && e.ice > 0) { this.emit('clank', { e }); return 'bounce'; }
      if (e.type === 'Bubble' && e.bubble) { e.bubble = false; e.bubbleT = 0; this.emit('pop', { e }); return 'bounce'; }

      let dmg = 1;
      if (b.skin.ability === 'monster' && this.rng() < 1 / 11) dmg = 2;
      const dead = this.damage(e, dmg, b);
      if (b.skin.ability === 'laser' && this.rng() < 1 / 20) this.laserRow(e.row, { x: b.x, y: b.y });

      if (e.type === 'Thorn') { b.phase = 'done'; this.returned++; this.emit('thorn', { x: b.x, y: b.y }); return 'bounce'; }
      if (dead) return 'bounce';
      if (e.type === 'Prison' && e.locked < 10 && this.availableBalls - 1 >= 1 && this.flying.filter((f) => f.phase === 'fly').length + this.toLaunch > 1) {
        e.locked++; this.prisonLocked++; b.phase = 'done';
        this.emit('prison', { e });
        return 'bounce';
      }
      if (e.type === 'Spread') return 'spread';
      if (e.type === 'Rotation') e.tri = (e.tri + 1) % 4;
      if (e.type === 'Move' && b.moveCd <= 0) { b.moveCd = 0.3; this.relocate(e); return 'pass'; }
      return 'bounce';
    }

    // retorna true se o bloco foi destruído
    damage(e, dmg, b) {
      if (!this.elements.includes(e)) return true;
      if (e.type === 'Share') {
        this.share.hp -= dmg;
        this.emit('hit', { e });
        if (this.share.hp <= 0) {
          for (const s of this.blocks().filter((x) => x.type === 'Share')) this.destroy(s, b);
          this.share = { hp: 0, max: 0 };
          return true;
        }
        return false;
      }
      e.hp -= dmg;
      this.emit('hit', { e });
      if (e.hp <= 0) { this.destroy(e, b); return true; }
      return false;
    }

    // dano de raio/foguete ignora blindagem e bolha
    trueDamage(e, dmg) {
      if (e.type === 'Lock' && this.elements.some((k) => k.id === e.keyId)) return;
      if (e.type === 'Ice' && e.ice > 0) return;
      this.damage(e, dmg, null);
    }

    destroy(e, b) {
      if (!this.elements.includes(e)) return;
      this.removeElement(e);
      const p = this.center(e);
      this.emit('break', { x: p.x, y: p.y, e });
      if (e.type === 'Split') this.spawnDivided(e);
      if (e.type === 'Heal') {
        const t = this.blocks().filter((x) => x.hp < x.maxHp && x.type !== 'Share');
        if (t.length) { const x = t[Math.floor(this.rng() * t.length)]; x.hp = x.maxHp; this.emit('heal', { e: x }); }
      }
      if (e.type === 'Prison' && e.locked > 0) {
        this.prisonLocked -= e.locked;
        for (let i = 0; i < e.locked; i++) this.greens.push({ x: p.x, y: p.y, vy: 0, done: false, landed: false, released: true });
        if (this.state !== 'shoot') this.greens = []; // fora do disparo: devolve direto
      }
      if (e.type === 'Share' && !this.blocks().some((x) => x.type === 'Share')) this.share = { hp: 0, max: 0 };
    }

    spawnDivided(e) {
      const hp = Math.max(1, Math.ceil(e.maxHp / 2));
      const around = this.shuffle([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]);
      let made = 0;
      for (const [dc, dr] of around) {
        const c = e.col + dc, r = e.row + dr;
        if (made >= 2) break;
        if (r < SPAWN_ROW || r >= ROWS - 1 || !this.isFree(c, r)) continue;
        const nb = this.mk('normal', c, r, hp);
        nb.visRow = r;
        made++;
      }
    }

    relocate(e) {
      const maxRow = Math.max(...this.blocks().map((x) => x.row), SPAWN_ROW);
      const cells = [];
      for (let r = SPAWN_ROW; r <= Math.min(maxRow, ROWS - 2); r++)
        for (let c = 0; c < COLS; c++) if (this.isFree(c, r)) cells.push([c, r]);
      if (!cells.length) return;
      const [c, r] = cells[Math.floor(this.rng() * cells.length)];
      const from = this.center(e);
      this.removeElement(e);
      e.col = c; e.row = r; e.visRow = r;
      this.elements.push(e);
      this.grid.set(key(c, r), e);
      this.emit('teleport', { from, to: this.center(e) });
    }

    laserRow(row, p) {
      for (const e of this.blocks()) if (this.cellsOf(e).some(([, r]) => r === row)) this.trueDamage(e, 1);
      this.emit('laser', { axis: 'h', y: TOP - CELL * (row + 0.5), x: p.x });
    }
    laserCol(col, p) {
      for (const e of this.blocks()) if (this.cellsOf(e).some(([c]) => c === col)) this.trueDamage(e, 1);
      this.emit('laser', { axis: 'v', x: LEFT + CELL * (col + 0.5), y: p.y });
    }

    // --------------------------------------------------------- itens ativos
    canUseAction(k) {
      return this.state === 'aim' && this.actionsUnlocked() && this.charges[k] !== 0;
    }
    useAction(k) {
      if (!this.canUseAction(k)) return false;
      const blocks = this.blocks();
      if (k === 'pad') {
        if (this.pad) return false;
        const cnt = new Array(COLS).fill(0);
        for (const e of blocks) for (const [c] of this.cellsOf(e)) if (c >= 0 && c < COLS) cnt[c]++;
        let best = 0;
        for (let c = 1; c < COLS; c++) if (cnt[c] > cnt[best]) best = c;
        const cx = LEFT + CELL * (best + 0.5);
        const x0 = clamp(cx - CELL, LEFT, RIGHT - 2 * CELL);
        this.pad = { x0, x1: x0 + 2 * CELL };
      } else if (k === 'drill') {
        if (!blocks.length) return false;
        const cnt = new Array(COLS).fill(0);
        for (const e of blocks) for (const [c] of this.cellsOf(e)) if (c >= 0 && c < COLS) cnt[c]++;
        let best = 0;
        for (let c = 1; c < COLS; c++) if (cnt[c] > cnt[best]) best = c;
        for (const e of blocks) if (this.cellsOf(e).some(([c]) => c === best)) this.destroy(e, null);
        this.emit('drill', { x: LEFT + CELL * (best + 0.5) });
      } else if (k === 'hline') {
        if (!blocks.length) return false;
        const row = Math.max(...blocks.map((e) => e.row));
        for (const e of blocks) if (this.cellsOf(e).some(([, r]) => r === row)) this.destroy(e, null);
        this.emit('laser', { axis: 'h', y: TOP - CELL * (row + 0.5), x: 0, big: true });
      } else if (k === 'super') {
        if (this.superShot) return false;
        this.superShot = true;
      }
      if (this.charges[k] > 0) this.charges[k]--;
      this.emit('action', { k });
      return true;
    }

    // ------------------------------------------------------------ fim de turno
    endTurn() {
      this.state = 'resolve';
      this.timeScale = 1;
      this.turn++;
      if (this.nextX != null) this.launchX = this.nextX;
      this.balls += this.pendingPlus;
      this.pad = null;
      this.superShot = false;

      // itens de ajuda usados somem
      for (const e of this.elements.filter((x) => x.kind === 'item' && x.used)) this.removeElement(e);

      // boosters
      const bl = this.blocks();
      if (this.opts.boosters.rocket && bl.length) {
        const target = bl.reduce((a, x) => ((x.type === 'Share' ? this.share.hp : x.hp) < (a.type === 'Share' ? this.share.hp : a.hp) ? x : a));
        const dmg = Math.max(1, Math.floor(this.balls / V.rocketDivisor));
        this.emit('rocket', { to: this.center(target) });
        this.trueDamage(target, dmg);
      }
      if (this.opts.boosters.blackhole && this.turn % 3 === 0) {
        const t = this.blocks();
        if (t.length) {
          const x = t[Math.floor(this.rng() * t.length)];
          this.emit('blackhole', { at: this.center(x) });
          this.destroy(x, null);
        }
      }

      // efeitos de fim de rodada dos blocos especiais
      for (const e of this.blocks()) {
        if (e.type === 'Recovery' && e.hp < e.maxHp) { e.hp = e.maxHp; this.emit('heal', { e }); }
        if (e.type === 'Bubble' && !e.bubble && ++e.bubbleT >= 2) e.bubble = true;
        if (e.type === 'Ice' && e.ice > 0) e.ice--;
        if (e.type === 'Transparent') e.invisible = !e.invisible;
      }
      for (const e of this.blocks().filter((x) => x.type === 'Drain')) {
        if (!this.elements.includes(e) || e.spawnTurn >= this.turn - 1) continue;
        const prey = [[-1, 0], [1, 0], [0, -1], [0, 1]]
          .map(([dc, dr]) => this.at(e.col + dc, e.row + dr))
          .filter((x) => x && x.kind === 'block' && x.type === 'normal');
        if (prey.length) {
          const v = prey[Math.floor(this.rng() * prey.length)];
          this.removeElement(v);
          e.hp += v.hp; e.maxHp += v.hp;
          this.emit('drain', { e, from: this.center(v) });
        }
      }

      this.moveDown();
      this.addLine();
      this.best = Math.max(this.best, this.line);

      // itens que chegaram ao chão somem
      for (const e of this.elements.filter((x) => x.kind === 'item' && x.row >= ROWS - 1)) this.removeElement(e);

      if (this.blocks().some((e) => e.row >= ROWS - 1)) {
        this.state = 'over';
        this.emit('gameover', { line: this.line });
        return;
      }
      this.state = 'aim';
      this.emit('turn', { warning: this.blocks().some((e) => e.row >= ROWS - 2) });
    }

    moveDown() {
      const els = [...this.elements].sort((a, b) => b.row - a.row);
      for (const e of els) { e.visRow = e.row; e.row++; }
      this.rebuildGrid();
      // Rush: anda uma casa a mais se a de baixo estiver livre
      for (const e of els.filter((x) => x.type === 'Rush')) {
        if (e.row + 1 <= ROWS - 1 && this.isFree(e.col, e.row + 1)) {
          this.grid.delete(key(e.col, e.row));
          e.row++;
          this.grid.set(key(e.col, e.row), e);
          this.emit('rush', { e });
        }
      }
    }

    // ------------------------------------------------------------- continuar
    continueCost() { return V.continueCost[Math.min(this.continues, V.continueCost.length - 1)]; }
    doContinue(free) {
      if (this.state !== 'over') return false;
      if (free) {
        if (this.freeContinueUsed) return false;
        this.freeContinueUsed = true;
      } else {
        const cost = this.continueCost();
        if (this.wallet < cost) return false;
        this.wallet -= cost;
        this.continues++;
      }
      // libera as 3 linhas de baixo
      for (const e of [...this.elements]) if (e.row >= ROWS - 4) {
        if (e.type === 'Prison' && e.locked) this.prisonLocked -= e.locked;
        this.removeElement(e);
      }
      if (!this.blocks().some((x) => x.type === 'Share')) this.share = { hp: 0, max: 0 };
      this.state = 'aim';
      this.emit('continue');
      return true;
    }

    // ---------------------------------------------------------------- save
    serialize() {
      return JSON.stringify({
        v: 1, line: this.line, turn: this.turn, balls: this.balls, launchX: this.launchX,
        elements: this.elements.map(({ visRow, ...e }) => e), nextId: this.nextId, share: this.share, continues: this.continues,
        freeContinueUsed: this.freeContinueUsed, charges: this.charges, prisonLocked: this.prisonLocked,
        boosters: this.opts.boosters,
      });
    }
    load(json) {
      const s = JSON.parse(json);
      Object.assign(this, {
        line: s.line, turn: s.turn, balls: s.balls, launchX: s.launchX, elements: s.elements,
        nextId: s.nextId, share: s.share, continues: s.continues, freeContinueUsed: s.freeContinueUsed,
        charges: s.charges, prisonLocked: s.prisonLocked,
      });
      this.opts.boosters = s.boosters || this.opts.boosters;
      for (const e of this.elements) e.visRow = e.row;
      this.flying = []; this.greens = []; this.pad = null; this.superShot = false;
      this.state = 'aim';
      this.rebuildGrid();
    }
  }

  QK.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
