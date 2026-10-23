// Desenho do campo, blocos, bolas e efeitos em canvas 2D.
(function (root) {
  const QK = root.QK;
  const { CELL, COLS, ROWS, LEFT, RIGHT, TOP, GROUND } = QK;
  const W = RIGHT - LEFT, H = TOP - GROUND;
  const FONT = '"Fredoka", "Trebuchet MS", system-ui, sans-serif';
  const FONT_D = '"Lilita One", "Fredoka", "Trebuchet MS", system-ui, sans-serif';
  const INK = '#120c2c';
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------ cores
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  // rampa de cor pelo HP relativo à linha atual; as cores vêm do tema ativo
  const STOPS = [0, 0.35, 0.7, 1.0, 1.4, 1.8, 2.2];
  let RAMP = [], rampOf = null;
  function rampRgb(t) {
    if (rampOf !== QK.theme) { rampOf = QK.theme; RAMP = STOPS.map((s, i) => [s, hex(QK.theme.ramp[i])]); }
    t = Math.max(0, Math.min(t, 2.2));
    for (let i = 1; i < RAMP.length; i++) {
      if (t <= RAMP[i][0]) {
        const [t0, a] = RAMP[i - 1], [t1, b] = RAMP[i];
        const k = (t - t0) / (t1 - t0);
        return [0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * k));
      }
    }
    return RAMP[RAMP.length - 1][1];
  }
  const rgb = (c, m) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(m == null ? v : m < 1 ? v * m : v + (255 - v) * (m - 1))))).join(',')})`;
  function blockRgb(hp, line) {
    return rampRgb(hp / Math.max(1, QK.lineHp(line)));
  }
  function blockColor(hp, line) { return rgb(blockRgb(hp, line)); }
  const LOCKED_RGB = [104, 108, 130];

  // ------------------------------------------------------------ bolinhas
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // sombreamento estilo desenho animado: meia-lua de sombra nítida + brilho recortado
  function shade(ctx, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, TAU);
    ctx.arc(-r * 0.2, -r * 0.24, r * 1.02, 0, TAU, true);
    ctx.fillStyle = 'rgba(20,12,60,0.2)';
    ctx.fill('evenodd');
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.44, r * 0.24, r * 0.13, -0.65, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.62, r * 0.06, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawEars(ctx, v, c1, c2, r) {
    const dot = (x, y, s, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, TAU); ctx.fill(); };
    if (v === 'bear' || v === 'mouse') {
      const s = v === 'mouse' ? 0.42 : 0.33;
      dot(-0.7, -0.72, s, c1); dot(0.7, -0.72, s, c1);
      dot(-0.7, -0.72, s * 0.55, v === 'mouse' ? c2 : 'rgba(0,0,0,0.25)'); dot(0.7, -0.72, s * 0.55, v === 'mouse' ? c2 : 'rgba(0,0,0,0.25)');
    } else if (v === 'cat' || v === 'fox' || v === 'monster') {
      ctx.fillStyle = v === 'monster' ? '#ffe066' : c1;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * r * 0.25, -r * 0.8); ctx.lineTo(sx * r * (v === 'monster' ? 0.6 : 0.85), -r * (v === 'fox' ? 1.35 : 1.2)); ctx.lineTo(sx * r * 0.92, -r * 0.3);
        ctx.closePath(); ctx.fill();
      }
    } else if (v === 'lion') {
      ctx.fillStyle = '#c4741c';
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.32, 0, TAU); ctx.fill(); }
    }
  }

  function drawFace(ctx, v, c2, r) {
    const dot = (x, y, s, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, TAU); ctx.fill(); };
    const ink = v === 'monster' ? '#1b1236' : c2;
    ctx.lineWidth = r * 0.13; ctx.lineCap = 'round'; ctx.strokeStyle = ink;
    if (v === 'shades') {
      ctx.fillStyle = ink; rr(ctx, -r * 0.72, -r * 0.32, r * 0.62, r * 0.36, r * 0.12); ctx.fill(); rr(ctx, r * 0.1, -r * 0.32, r * 0.62, r * 0.36, r * 0.12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.22); ctx.lineTo(r * 0.1, -r * 0.22); ctx.stroke();
    } else if (v === 'laugh') {
      ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.12, r * 0.15, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.12, r * 0.15, Math.PI, 0); ctx.stroke();
    } else if (v === 'monster') {
      dot(0, -0.18, 0.34, '#ffffff'); dot(0.05, -0.15, 0.17, ink);
    } else {
      const ey = v === 'slime' ? -0.05 : -0.15;
      dot(-0.32, ey, 0.13, ink); dot(0.32, ey, 0.13, ink);
      dot(-0.28, ey - 0.05, 0.045, '#ffffff'); dot(0.36, ey - 0.05, 0.045, '#ffffff');
    }
    if (v === 'mouse' || v === 'bear' || v === 'cat' || v === 'fox' || v === 'lion') dot(0, 0.14, 0.1, v === 'mouse' ? '#ff6f91' : '#3a2010');
    ctx.strokeStyle = ink;
    if (v === 'laugh') {
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, r * 0.15, r * 0.42, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#ff6f91'; ctx.beginPath(); ctx.arc(0, r * 0.42, r * 0.18, Math.PI, 0); ctx.fill();
    } else if (v === 'tongue') {
      ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.36, 0.25, Math.PI - 0.25); ctx.stroke();
      ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.ellipse(r * 0.12, r * 0.52, r * 0.16, r * 0.2, 0, 0, TAU); ctx.fill();
    } else if (v === 'monster') {
      ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.35); ctx.quadraticCurveTo(0, r * 0.62, r * 0.4, r * 0.35); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.42); ctx.lineTo(-r * 0.12, r * 0.6); ctx.lineTo(-r * 0.04, r * 0.45); ctx.fill();
    } else if (v === 'slime') {
      ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.18, 0.2, Math.PI - 0.2); ctx.stroke();
    } else if (v === 'shades') {
      ctx.beginPath(); ctx.arc(r * 0.05, r * 0.15, r * 0.3, 0.35, Math.PI - 0.9); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.34, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    if (v !== 'monster' && v !== 'shades') { dot(-0.55, 0.22, 0.12, 'rgba(255,100,130,0.35)'); dot(0.55, 0.22, 0.12, 'rgba(255,100,130,0.35)'); }
  }

  function drawBallShape(ctx, skin, r) {
    const [c1, c2, pat, variant] = skin.look;
    ctx.save();
    if (skin.shape === 'square') {
      rr(ctx, -r, -r, r * 2, r * 2, r * 0.3); ctx.fillStyle = c1; ctx.fill(); ctx.clip(); shade(ctx, r * 1.2); ctx.restore(); return;
    }
    if (skin.shape === 'triangle') {
      ctx.beginPath(); ctx.moveTo(0, -r * 1.15); ctx.lineTo(r * 1.05, r * 0.8); ctx.lineTo(-r * 1.05, r * 0.8); ctx.closePath();
      ctx.fillStyle = c1; ctx.lineJoin = 'round'; ctx.lineWidth = r * 0.25; ctx.strokeStyle = c1; ctx.stroke(); ctx.fill(); ctx.clip(); shade(ctx, r * 1.2);
      ctx.restore(); return;
    }
    if (pat === 'face' && variant) drawEars(ctx, variant, c1, c2, r);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.closePath();
    if (pat === 'glow') { ctx.shadowColor = c2; ctx.shadowBlur = r * 1.1; }
    ctx.fillStyle = c1; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c2; ctx.strokeStyle = c2; ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
    const dot = (x, y, s) => { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, TAU); ctx.fill(); };
    switch (pat) {
      case 'eight': ctx.fillStyle = '#ffffff'; dot(0, 0, 0.42); ctx.fillStyle = '#26262e'; ctx.font = `600 ${r * 0.6}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('8', 0, r * 0.04); break;
      case 'basket': ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke(); ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * 0.95, -1, 1); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.25, 0, r * 0.95, Math.PI - 1, Math.PI + 1); ctx.stroke(); break;
      case 'soccer': {
        const pent = (cx, cy, s) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; ctx.lineTo(cx * r + Math.cos(a) * s * r, cy * r + Math.sin(a) * s * r); } ctx.closePath(); ctx.fill(); };
        pent(0, 0.05, 0.36); pent(-0.88, -0.45, 0.3); pent(0.88, -0.45, 0.3); pent(-0.55, 0.92, 0.3); pent(0.55, 0.92, 0.3); break;
      }
      case 'base': ctx.lineWidth = r * 0.1; ctx.setLineDash([r * 0.12, r * 0.12]); ctx.beginPath(); ctx.arc(-r * 1.3, 0, r * 0.9, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.3, 0, r * 0.9, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); ctx.setLineDash([]); break;
      case 'burger': ctx.fillStyle = '#ffd23f'; ctx.fillRect(-r, -0.15 * r, 2 * r, 0.18 * r); ctx.fillStyle = c2; ctx.fillRect(-r, 0.02 * r, 2 * r, 0.18 * r); ctx.fillStyle = '#6b3a1a'; ctx.fillRect(-r, 0.2 * r, 2 * r, 0.3 * r); ctx.fillStyle = '#fff3d0'; dot(-0.3, -0.5, 0.06); dot(0.15, -0.6, 0.06); dot(0.4, -0.4, 0.06); break;
      case 'bubble': ctx.globalAlpha = 0.8; dot(-0.35, -0.38, 0.22); dot(0.1, -0.6, 0.09); ctx.globalAlpha = 1; break;
      case 'ring': ctx.lineWidth = r * 0.28; ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, TAU); ctx.stroke(); break;
      case 'clock': ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.62); ctx.moveTo(0, 0); ctx.lineTo(r * 0.45, r * 0.12); ctx.stroke(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; dot(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.05); } break;
      case 'earth': dot(-0.4, -0.2, 0.45); dot(0.5, 0.45, 0.35); dot(0.55, -0.55, 0.18); break;
      case 'dots': dot(-0.4, -0.3, 0.22); dot(0.35, 0.1, 0.18); dot(-0.1, 0.5, 0.15); dot(0.45, -0.5, 0.1); break;
      case 'star': {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = (i % 2 ? 0.28 : 0.66) * r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
        ctx.closePath(); ctx.fill(); break;
      }
      case 'eye': ctx.fillStyle = c2; dot(0, 0, 0.55); ctx.fillStyle = '#111'; dot(0, 0, 0.26); ctx.fillStyle = '#fff'; dot(-0.12, -0.12, 0.09); break;
      case 'rainbow': {
        const cols = c1 === '#ffffff' ? ['#ff4d4d', '#ffb347', '#ffe066', '#3ecf6a', '#4d8dff', '#9b59ff'] : [c1, c2, c1, c2, c1, c2];
        cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-r, -r + i * (2 * r / 6), 2 * r, 2 * r / 6 + 0.5); });
        break;
      }
      case 'fruit': ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(r * 0.25, -r * 0.82, r * 0.32, r * 0.15, -0.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#6b3a1a'; ctx.fillRect(-r * 0.05, -r, r * 0.1, r * 0.3); break;
      case 'half': ctx.fillRect(-r, -r, 2 * r, r); ctx.fillStyle = c1; dot(0, -0.5, 0.18); ctx.fillStyle = c2; dot(0, 0.5, 0.18); break;
      case 'target': ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.arc(0, 0, r * 0.65, 0, TAU); ctx.stroke(); dot(0, 0, 0.25); break;
      case 'panda': dot(-0.7, -0.78, 0.3); dot(0.7, -0.78, 0.3); ctx.beginPath(); ctx.ellipse(-r * 0.33, -r * 0.05, r * 0.18, r * 0.24, 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.33, -r * 0.05, r * 0.18, r * 0.24, -0.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; dot(-0.3, -0.08, 0.06); dot(0.3, -0.08, 0.06); ctx.fillStyle = c2; dot(0, 0.3, 0.1); break;
      case 'face': drawFace(ctx, variant || 'smile', c2, r); break;
      case 'flower': for (let i = 0; i < 5; i++) { const a = i * TAU / 5; dot(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.3); } ctx.fillStyle = '#ffe066'; dot(0, 0, 0.26); break;
      case 'stripe': for (let i = -3; i <= 3; i += 2) { ctx.beginPath(); ctx.moveTo(i * r * 0.4 - r, -r); ctx.lineTo(i * r * 0.4 + r, r); ctx.stroke(); } break;
      case 'melon': ctx.fillStyle = c2; dot(0, 0.2, 0.75); ctx.fillStyle = '#222'; dot(-0.3, 0.2, 0.07); dot(0.2, 0.4, 0.07); dot(0.1, 0, 0.07); dot(-0.1, 0.55, 0.07); break;
      case 'coin': ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, TAU); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = (i % 2 ? 0.2 : 0.46) * r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.fill(); break;
      case 'dice': ctx.fillStyle = c2; dot(-0.4, -0.4, 0.15); dot(0, 0, 0.15); dot(0.4, 0.4, 0.15); break;
      case 'heart': ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.bezierCurveTo(-r * 0.9, -r * 0.1, -r * 0.35, -r * 0.75, 0, -r * 0.25); ctx.bezierCurveTo(r * 0.35, -r * 0.75, r * 0.9, -r * 0.1, 0, r * 0.5); ctx.fill(); break;
      case 'bolt': ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.85); ctx.lineTo(-r * 0.4, r * 0.1); ctx.lineTo(-r * 0.02, r * 0.1); ctx.lineTo(-r * 0.15, r * 0.85); ctx.lineTo(r * 0.42, -r * 0.12); ctx.lineTo(r * 0.04, -r * 0.12); ctx.closePath(); ctx.fill(); break;
      default: break;
    }
    shade(ctx, r);
    ctx.restore();
    // contorno: escuro e firme quando grande (vitrine), discreto quando pequena (em jogo)
    ctx.lineWidth = r > 10 ? Math.max(2, r * 0.08) : Math.max(0.6, r * 0.07);
    ctx.strokeStyle = r > 10 ? INK : 'rgba(10,8,40,0.45)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  const spriteCache = new Map();
  function ballSprite(skin, pr) {
    const k = skin.id + ':' + Math.round(pr * 4);
    let s = spriteCache.get(k);
    if (!s) {
      const size = Math.ceil(pr * 5 + 6);
      s = document.createElement('canvas');
      s.width = s.height = size;
      const c = s.getContext('2d');
      c.translate(size / 2, size / 2);
      drawBallShape(c, skin, pr);
      spriteCache.set(k, s);
    }
    return s;
  }
  QK.drawBallShape = drawBallShape;
  QK.drawBallPreview = function (canvas, skin) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.save(); c.translate(canvas.width / 2, canvas.height / 2 + canvas.height * 0.03);
    drawBallShape(c, skin, canvas.width * 0.3 * Math.max(skin.size, 0.6));
    c.restore();
  };

  // Bloco com carinha fora do jogo (pedestal, carregamento, miniaturas).
  // x,y = centro da base; size = lado; squash 0..1 achata; look = ponto que os olhos seguem
  function toyBlock(ctx, x, y, size, base, o) {
    o = o || {};
    const sq = o.squash || 0, w = size * (1 + sq * 0.18), h = size * (1 - sq * 0.22);
    const lw = Math.max(2, size * 0.06), r = size * 0.2, depth = size * 0.1;
    const left = x - w / 2, top = y - h - depth;
    rr(ctx, left, top + depth, w, h, r); ctx.fillStyle = INK; ctx.fill();
    rr(ctx, left, top + depth * 0.85, w, h, r); ctx.fillStyle = rgb(base, 0.6); ctx.fill();
    rr(ctx, left, top, w, h, r);
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, rgb(base, 1.18)); g.addColorStop(1, rgb(base, 0.92));
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    rr(ctx, left + w * 0.16, top + h * 0.1, w * 0.68, h * 0.12, h * 0.06); ctx.fill();
    // olhos
    const ex = w * 0.2, ey = top + h * 0.45, er = size * 0.075;
    ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineWidth = er * 0.8;
    if (sq > 0.35) {
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sgn * ex - sgn * er, ey - er); ctx.lineTo(x + sgn * ex + sgn * er * 0.6, ey); ctx.lineTo(x + sgn * ex - sgn * er, ey + er); ctx.stroke(); }
    } else {
      let px = 0, py = 0;
      if (o.look) { const dx = o.look.x - x, dy = o.look.y - ey, d = Math.hypot(dx, dy) || 1; px = dx / d * er * 0.4; py = dy / d * er * 0.4; }
      for (const sgn of [-1, 1]) {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + sgn * ex + px, ey + py, er * 0.85, er * 1.15, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + sgn * ex + px - er * 0.25, ey + py - er * 0.4, er * 0.32, 0, TAU); ctx.fill();
      }
    }
    // boquinha
    ctx.strokeStyle = INK; ctx.lineWidth = er * 0.7;
    ctx.beginPath(); ctx.arc(x, ey + h * 0.12, er * (sq > 0.35 ? 1.3 : 1), 0.2, Math.PI - 0.2); ctx.stroke();
    return top;
  }
  QK.toyBlock = toyBlock;

  // Bolinha quicando com squash & stretch (tela inicial e vitrine)
  class BallStage {
    constructor(canvas, opts) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.t = Math.random(); this.spin = 0; this.skin = QK.BALLS[0];
      this.pedestal = !!(opts && opts.pedestal);
    }
    setSkin(s) { this.skin = s; }
    fit() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
      if (w && (this.canvas.width !== w || this.canvas.height !== h)) { this.canvas.width = w; this.canvas.height = h; }
    }
    draw(dt) {
      this.fit();
      const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
      if (!cw) return;
      const PERIOD = 1.15;
      this.t = (this.t + dt / PERIOD) % 1;
      this.spin += dt * 1.6;
      const r = Math.min(cw, ch) * (this.pedestal ? 0.15 : 0.2) * Math.max(this.skin.size, 0.7);
      const bsize = cw * 0.36;
      const floor = this.pedestal ? ch * 0.94 - bsize * 1.1 : ch * 0.84, top = ch * 0.12 + r;
      // parábola: u em [0,1], quica em u=0/1
      const u = this.t, hgt = 4 * u * (1 - u);
      let y = floor - r - hgt * (floor - r - top);
      // squash perto do chão, stretch na subida/descida
      const near = Math.max(0, 1 - Math.min(u, 1 - u) / 0.08);
      const speed = Math.abs(1 - 2 * u);
      const sx = 1 + near * 0.2 - speed * 0.04 * (1 - near);
      const sy = 1 - near * 0.17 + speed * 0.05 * (1 - near);
      y += near * r * 0.17;
      if (this.pedestal) y += near * 0.7 * 0.22 * bsize;
      ctx.clearRect(0, 0, cw, ch);
      if (this.pedestal) {
        // sombra no chão + bloco que se achata quando a bola cai
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(cw / 2, ch * 0.95, bsize * 0.62, bsize * 0.1, 0, 0, TAU); ctx.fill();
        toyBlock(ctx, cw / 2, ch * 0.94, bsize, rampRgb(1), { squash: near * 0.7, look: { x: cw / 2, y } });
      }
      // sombra
      const sh = 1 - hgt * 0.6;
      ctx.fillStyle = `rgba(0,0,0,${0.28 * sh})`;
      const fl = floor + (this.pedestal ? near * 0.7 * 0.22 * bsize : 0);
      ctx.beginPath(); ctx.ellipse(cw / 2, fl + r * 0.06, r * (0.95 * sh + 0.25 * near), r * 0.2 * sh, 0, 0, TAU); ctx.fill();
      // brilho/rastro
      if (this.skin.trail) {
        ctx.fillStyle = this.skin.trail; ctx.globalAlpha = 0.18 * speed;
        ctx.beginPath(); ctx.ellipse(cw / 2, y + (u < 0.5 ? r * 0.9 : -r * 0.9), r * 0.7, r * 0.9, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.translate(cw / 2, y);
      ctx.scale(sx, sy);
      ctx.rotate(Math.sin(this.spin) * 0.25);
      drawBallShape(ctx, this.skin, r);
      ctx.restore();
    }
  }
  QK.BallStage = BallStage;

  // Tela de carregamento: bolinhas pulando de bloco em bloco, da esquerda para a direita.
  // Cada bola tem uma posição p em "saltos": p inteiro = pousada no bloco p.
  // p < 0 entra pela esquerda e p > N-1 sai pela direita (com fade), depois recomeça.
  class LoaderScene {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.t = 0;
      this.skins = [1, 45, 4, 34, 55, 49, 30, 63].map((id) => QK.ballById(id));
      this.balls = [0, 1, 2].map((i) => ({ p: -1 + i * 2, skin: this.skins[i], next: i + 3, spin: Math.random() * TAU }));
    }
    draw(dt) {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
      if (!w) return;
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.t += dt;
      const ctx = this.ctx, N = 5, gap = w / (N + 0.4), size = Math.min(gap * 0.72, h * 0.34);
      const floorY = h * 0.94, x0 = (w - gap * (N - 1)) / 2;
      const colX = (k) => x0 + gap * k;
      const blockTop = floorY - size * 1.1;
      const r = size * 0.24, jump = h * 0.3, HOPS = 1.5; // saltos por segundo
      const CYCLE = N + 1;                                 // de -1 até N-1, e mais um para sair
      ctx.clearRect(0, 0, w, h);

      // avança as bolas
      for (const b of this.balls) {
        b.p += dt * HOPS;
        b.spin += dt * 5;
        if (b.p >= N) { b.p -= CYCLE; b.skin = this.skins[b.next++ % this.skins.length]; }
      }
      // achatamento de cada bloco: bola perto do pouso (p ~ inteiro)
      const squash = new Array(N).fill(0);
      for (const b of this.balls) for (let j = 0; j < N; j++) {
        const d = Math.abs(b.p - j);
        if (d < 0.14) squash[j] = Math.max(squash[j], 1 - d / 0.14);
      }
      // posição de cada bola: arco entre o bloco floor(p) e o seguinte
      const pos = this.balls.map((b) => {
        const k = Math.floor(b.p), f = b.p - k;
        const xa = colX(k), xb = colX(k + 1);
        const land = (j) => (j >= 0 && j < N ? squash[j] * 0.75 * 0.22 * size : 0);
        const baseA = blockTop + land(k), baseB = blockTop + land(k + 1);
        const x = xa + (xb - xa) * f;
        const y = baseA + (baseB - baseA) * f - r - Math.sin(Math.PI * f) * jump;
        const near = Math.max(0, 1 - Math.min(f, 1 - f) / 0.12);
        const alpha = b.p < -0.4 ? Math.max(0, (b.p + 1) / 0.6) : b.p > N - 0.6 ? Math.max(0, (N - b.p) / 0.6) : 1;
        return { x, y, near, alpha, b };
      });

      for (let j = 0; j < N; j++) {
        const cx = colX(j);
        let look = { x: cx, y: 0 }, bd = Infinity;
        for (const q of pos) { const d = Math.abs(q.x - cx); if (d < bd && q.alpha > 0.3) { bd = d; look = q; } }
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(cx, floorY + 1, size * 0.58, size * 0.09, 0, 0, TAU); ctx.fill();
        toyBlock(ctx, cx, floorY, size, rampRgb(0.35 + j * 0.2), { squash: squash[j] * 0.75, look });
      }

      for (const q of pos) {
        if (q.alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = q.alpha;
        ctx.translate(q.x, q.y + q.near * r * 0.15);
        ctx.scale(1 + q.near * 0.2, 1 - q.near * 0.17);
        ctx.rotate(q.b.spin);
        drawBallShape(ctx, q.b.skin, r);
        ctx.restore();
      }
    }
  }
  QK.LoaderScene = LoaderScene;

  // ------------------------------------------------------------ glifos (ícones vetoriais dos blocos)
  function glyph(ctx, name, x, y, R, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = R * 0.24; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (name) {
      case 'key':
        ctx.arc(-R * 0.3, 0, R * 0.32, 0, TAU); ctx.moveTo(0, 0); ctx.lineTo(R * 0.7, 0); ctx.moveTo(R * 0.5, 0); ctx.lineTo(R * 0.5, R * 0.3);
        ctx.stroke(); break;
      case 'lock': case 'unlock':
        rr(ctx, -R * 0.5, -R * 0.05, R, R * 0.7, R * 0.15); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 0.32, Math.PI, name === 'lock' ? 0 : -0.5); if (name === 'lock') ctx.lineTo(R * 0.32, 0); ctx.moveTo(-R * 0.32, -R * 0.1); ctx.lineTo(-R * 0.32, 0); ctx.stroke(); break;
      case 'plus': ctx.moveTo(-R * 0.5, 0); ctx.lineTo(R * 0.5, 0); ctx.moveTo(0, -R * 0.5); ctx.lineTo(0, R * 0.5); ctx.lineWidth = R * 0.3; ctx.stroke(); break;
      case 'heart':
        ctx.moveTo(0, R * 0.55); ctx.bezierCurveTo(-R * 0.95, -R * 0.05, -R * 0.4, -R * 0.75, 0, -R * 0.25); ctx.bezierCurveTo(R * 0.4, -R * 0.75, R * 0.95, -R * 0.05, 0, R * 0.55); ctx.fill(); break;
      case 'burst': for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.moveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6); ctx.lineTo(-Math.cos(a) * R * 0.6, -Math.sin(a) * R * 0.6); } ctx.stroke(); break;
      case 'rotate':
        ctx.arc(0, 0, R * 0.45, -0.3, Math.PI * 1.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(R * 0.6, -R * 0.4); ctx.lineTo(R * 0.43, -R * 0.12); ctx.lineTo(R * 0.15, -R * 0.3); ctx.stroke(); break;
      case 'swap': ctx.moveTo(-R * 0.55, -R * 0.2); ctx.lineTo(R * 0.5, -R * 0.2); ctx.lineTo(R * 0.25, -R * 0.45); ctx.moveTo(R * 0.55, R * 0.25); ctx.lineTo(-R * 0.5, R * 0.25); ctx.lineTo(-R * 0.25, R * 0.5); ctx.stroke(); break;
      case 'chevrons': ctx.moveTo(-R * 0.45, -R * 0.45); ctx.lineTo(0, -R * 0.05); ctx.lineTo(R * 0.45, -R * 0.45); ctx.moveTo(-R * 0.45, R * 0.05); ctx.lineTo(0, R * 0.45); ctx.lineTo(R * 0.45, R * 0.05); ctx.stroke(); break;
      case 'link':
        ctx.lineWidth = R * 0.2;
        rr(ctx, -R * 0.62, -R * 0.22, R * 0.7, R * 0.44, R * 0.22); ctx.stroke();
        rr(ctx, -R * 0.08, -R * 0.22, R * 0.7, R * 0.44, R * 0.22); ctx.stroke(); break;
      case 'mouth':
        ctx.arc(0, -R * 0.1, R * 0.5, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-R * 0.25, R * 0.0); ctx.lineTo(-R * 0.15, R * 0.2); ctx.lineTo(-R * 0.05, R * 0.0); ctx.moveTo(R * 0.05, R * 0.0); ctx.lineTo(R * 0.15, R * 0.2); ctx.lineTo(R * 0.25, R * 0.0); ctx.fill(); break;
      case 'x2':
        ctx.font = `700 ${R * 1.05}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('2x', 0, R * 0.06); break;
      case 'split': ctx.moveTo(0, -R * 0.6); ctx.lineTo(-R * 0.2, -R * 0.15); ctx.lineTo(R * 0.2, R * 0.15); ctx.lineTo(0, R * 0.6); ctx.stroke(); break;
      default: break;
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ cenário
  class Backdrop {
    constructor() {
      this.shapes = [];
      for (let i = 0; i < 14; i++) this.shapes.push(this.spawn(Math.random()));
    }
    spawn(y) {
      return { x: Math.random(), y, s: 0.03 + Math.random() * 0.06, v: 0.006 + Math.random() * 0.012, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.4, round: Math.random() < 0.4, hue: Math.random() };
    }
    draw(ctx, cw, ch, dt) {
      const th = QK.theme;
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, th.bg[0]); g.addColorStop(0.55, th.bg[1]); g.addColorStop(1, th.bg[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      const m = Math.min(cw, ch);
      for (const p of this.shapes) {
        p.y -= p.v * dt; p.rot += p.vr * dt;
        if (p.y < -0.1) Object.assign(p, this.spawn(1.1));
        const sz = p.s * m;
        ctx.save();
        ctx.translate(p.x * cw, p.y * ch); ctx.rotate(p.rot);
        ctx.fillStyle = p.hue < 0.5 ? th.float[0] : th.float[1];
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, sz / 2, 0, TAU); ctx.fill(); }
        else { rr(ctx, -sz / 2, -sz / 2, sz, sz, sz * 0.28); ctx.fill(); }
        ctx.restore();
      }
    }
  }

  class Renderer {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.game = game;
      this.fx = [];
      this.texts = [];
      this.hits = new Map();
      this.shake = 0;
      this.aim = null;
      this.flash = 0;
      this.snow = [];
      this.backdrop = new Backdrop();
      this.scale = 1; this.ox = 0; this.oy = 0; this.dpr = 1;
      this.banners = [];        // textos grandes (elogios, marcos, recorde)
      this.confetti = [];
      this.lands = new Map();   // momento em que cada bloco terminou de descer
      this.hint = false;        // mãozinha de tutorial
      this.cancel = false;      // dedo abaixo do chão: solte para cancelar
      this.mood = null;         // 'laugh' quando os blocos vencem
      this.shakeOn = true;
      this.faces = true;
      this.bodyCache = new Map();
      this.numCache = new Map();
      this.bg = null; this.bgKey = '';
      this.maxDpr = 3;          // baixa sozinho se o aparelho não aguentar (ver main.js)
    }
    setGame(g) { this.game = g; this.fx = []; this.texts = []; this.hits.clear(); this.lands.clear(); this.banners = []; this.confetti = []; this.mood = null; this.cancel = false; }

    // texto grande no meio do campo
    banner(text, color, sub) {
      this.banners = [{ text, color, sub, t: 0, life: 1.5 }];
    }
    burst(n) {
      const cw = this.canvas.width;
      const cols = QK.theme.ramp.concat(['#ffffff', '#ffd23f']);
      for (let i = 0; i < (n || 70); i++) {
        this.confetti.push({ x: cw * (0.1 + Math.random() * 0.8), y: -20 * this.dpr - Math.random() * 120 * this.dpr,
          vx: (Math.random() - 0.5) * 140 * this.dpr, vy: (60 + Math.random() * 160) * this.dpr, rot: Math.random() * TAU,
          vr: (Math.random() - 0.5) * 10, w: (5 + Math.random() * 5) * this.dpr, h: (8 + Math.random() * 6) * this.dpr,
          c: cols[Math.floor(Math.random() * cols.length)], t: 0, life: 2.4 + Math.random() });
      }
    }

    resize(cssW, cssH, padTop, padBottom) {
      this.lastSize = [cssW, cssH, padTop, padBottom];
      const dpr = Math.min(root.devicePixelRatio || 1, this.maxDpr);
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
      const availH = cssH - padTop - padBottom;
      this.scale = Math.min((cssW - 12) / W, availH / H) * dpr;
      this.ox = (this.canvas.width - W * this.scale) / 2;
      this.oy = padTop * dpr + (availH * dpr - H * this.scale) / 2;
      this.dpr = dpr;
      this.bodyCache.clear(); this.numCache.clear(); this.bgKey = '';
    }
    // baixa a resolução interna um degrau (chamado quando o aparelho não aguenta)
    lowerQuality() {
      const cur = Math.min(root.devicePixelRatio || 1, this.maxDpr);
      if (cur <= 1.5 || !this.lastSize) return false;
      this.maxDpr = Math.max(1.5, cur - 0.5);
      this.resize(...this.lastSize);
      return true;
    }
    sx(x) { return this.ox + (x - LEFT) * this.scale; }
    sy(y) { return this.oy + (TOP - y) * this.scale; }
    // tela (px CSS) -> mundo
    toWorld(px, py) {
      return { x: (px * this.dpr - this.ox) / this.scale + LEFT, y: TOP - (py * this.dpr - this.oy) / this.scale };
    }
    fieldRect() {
      return { x: this.ox / this.dpr, y: this.oy / this.dpr, w: W * this.scale / this.dpr, h: H * this.scale / this.dpr };
    }

    // ---------------------------------------------------------- eventos
    onEvent(t, d) {
      const g = this.game;
      if (t === 'hit' && d.e) {
        this.hits.set(d.e.id, performance.now());
      } else if (t === 'break') {
        const c = d.e.kind === 'block' ? blockRgb(d.e.hp > 0 ? d.e.hp : d.e.maxHp, g.line) : [255, 255, 255];
        const n = d.e.big ? 22 : 11;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU, sp = 30 + Math.random() * 70;
          this.fx.push({ k: 'p', x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 20, life: 0.55, t: 0, c: rgb(c, Math.random() < 0.3 ? 1.35 : 1), s: 1.2 + Math.random() * 1.8, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12 });
        }
        this.fx.push({ k: 'ring', x: d.x, y: d.y, life: 0.3, t: 0, c: rgb(c, 1.4), big: d.e.big });
        if (d.e.big && this.shakeOn) this.shake = Math.max(this.shake, 0.12);
      } else if (t === 'laser') {
        this.fx.push({ k: 'laser', axis: d.axis, x: d.x, y: d.y, life: d.big ? 0.5 : 0.22, t: 0, big: d.big });
      } else if (t === 'plus') {
        this.texts.push({ x: d.x, y: d.y, s: '+1', c: '#6dffb0', t: 0, life: 0.7 });
        this.fx.push({ k: 'ring', x: d.x, y: d.y, life: 0.3, t: 0, c: '#6dffb0' });
      } else if (t === 'coin') {
        this.texts.push({ x: d.x, y: d.y, s: '+' + d.v, c: '#ffd23f', t: 0, life: 0.8 });
      } else if (t === 'rocket') {
        this.fx.push({ k: 'rocket', x: 0, y: GROUND, tx: d.to.x, ty: d.to.y, life: 0.35, t: 0 });
      } else if (t === 'blackhole') {
        this.fx.push({ k: 'hole', x: d.at.x, y: d.at.y, life: 0.6, t: 0 });
      } else if (t === 'teleport') {
        this.fx.push({ k: 'ring', x: d.from.x, y: d.from.y, life: 0.3, t: 0, c: '#b58cff' });
        this.fx.push({ k: 'ring', x: d.to.x, y: d.to.y, life: 0.3, t: 0, c: '#b58cff' });
      } else if (t === 'thorn' || t === 'prison') {
        const p = d.e ? g.center(d.e) : d;
        this.fx.push({ k: 'ring', x: p.x, y: p.y, life: 0.25, t: 0, c: t === 'thorn' ? '#ff5c7c' : '#c0c4d8' });
      } else if (t === 'heal' && d.e) {
        const p = g.center(d.e);
        this.texts.push({ x: p.x, y: p.y + 6, s: '+', c: '#6dffb0', t: 0, life: 0.7 });
      } else if (t === 'drill') {
        this.fx.push({ k: 'laser', axis: 'v', x: d.x, y: 0, life: 0.5, t: 0, big: true });
      } else if (t === 'gameover') {
        if (this.shakeOn) this.shake = 0.35;
        this.mood = 'laugh';
      } else if (t === 'continue') {
        this.mood = null;
      } else if (t === 'turn' && d.warning) {
        this.flash = 1;
      }
    }

    // ---------------------------------------------------------- desenho
    drawIdle(dt) {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.backdrop.draw(ctx, this.canvas.width, this.canvas.height, dt);
    }

    draw(dt) {
      const ctx = this.ctx, g = this.game, s = this.scale;
      const cw = this.canvas.width, ch = this.canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.background(), 0, 0);
      if (this.shake > 0) { this.shake -= dt; const a = this.shake * 14 * this.dpr; ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a); }

      // campo (fundo e pontinhos já vieram do cache; aqui só o recorte)
      const fx = this.sx(LEFT), fy = this.sy(TOP), fw = W * s, fh = H * s;
      const pad = 1.2 * s;
      ctx.save();
      rr(ctx, fx - pad, fy - pad, fw + pad * 2, fh + pad * 2 + s * 0.6, 1.6 * s);
      ctx.clip();
      if (g.skin.snow) this.drawSnow(dt, fx, fy, fw, fh);
      // aviso de perigo
      const danger = this.flash > 0 || g.blocks().some((e) => e.row >= ROWS - 2);
      if (danger) {
        const a = 0.1 + 0.08 * Math.sin(performance.now() / 160);
        const y0 = this.sy(TOP - CELL * (ROWS - 1));
        const gr = ctx.createLinearGradient(0, y0, 0, y0 + CELL * s);
        gr.addColorStop(0, 'rgba(255,60,100,0)'); gr.addColorStop(1, `rgba(255,60,100,${Math.max(a, 0) * 2})`);
        ctx.fillStyle = gr; ctx.fillRect(fx, y0, fw, CELL * s);
        this.flash = Math.max(0, this.flash - dt);
      }
      // chão
      const gy = this.sy(GROUND);
      const gl = ctx.createLinearGradient(fx, 0, fx + fw, 0);
      const gc = QK.theme.ground;
      gl.addColorStop(0, `rgba(${gc},0.12)`); gl.addColorStop(0.5, danger ? 'rgba(255,90,120,0.9)' : `rgba(${gc},0.75)`); gl.addColorStop(1, `rgba(${gc},0.12)`);
      ctx.fillStyle = gl; ctx.fillRect(fx, gy, fw, Math.max(2, s * 0.45));

      // elementos
      const now = performance.now();
      const lerp = Math.min(1, dt * 12);
      for (const e of g.elements) {
        if (e.visRow == null) e.visRow = e.row;
        const moving = e.visRow !== e.row;
        e.visRow += (e.row - e.visRow) * lerp;
        if (Math.abs(e.row - e.visRow) < 0.01) { e.visRow = e.row; if (moving && e.kind === 'block') this.lands.set(e.id, now); }
      }
      for (const e of g.elements) if (e.kind === 'item') this.drawItem(e, now);
      for (const e of g.elements) if (e.kind === 'block') this.drawBlock(e, now);

      // trampolim
      if (g.pad) {
        const x0 = this.sx(g.pad.x0), w = (g.pad.x1 - g.pad.x0) * s;
        rr(ctx, x0 + s * 0.4, gy - s * 1.7, w - s * 0.8, s * 1.3, s * 0.35);
        ctx.fillStyle = '#ffd23f'; ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x0 + s, gy - s * 0.9, w - 2 * s, s * 0.35);
      }

      // bolas verdes coletadas
      for (const gb of g.greens) {
        ctx.fillStyle = '#6dffb0';
        ctx.beginPath(); ctx.arc(this.sx(gb.x), this.sy(gb.y), QK.BALL_R * s, 0, TAU); ctx.fill();
      }
      // bolas em jogo
      for (const b of g.flying) {
        const pr = b.r * s;
        if (b.skin.trail && b.phase === 'fly') {
          ctx.strokeStyle = b.skin.trail; ctx.globalAlpha = 0.35; ctx.lineWidth = pr * 1.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(this.sx(b.x), this.sy(b.y)); ctx.lineTo(this.sx(b.x - b.vx * 0.03), this.sy(b.y - b.vy * 0.03)); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (b.superBall) { ctx.fillStyle = 'rgba(255,210,63,0.35)'; ctx.beginPath(); ctx.arc(this.sx(b.x), this.sy(b.y), pr * 1.9, 0, TAU); ctx.fill(); }
        const spr = ballSprite(b.skin, pr);
        ctx.drawImage(spr, this.sx(b.x) - spr.width / 2, this.sy(b.y) - spr.height / 2);
      }

      this.drawEffects(dt);
      ctx.restore();

      this.drawLauncher();
      if (g.state === 'aim' && this.aim) this.drawAim();
      if (g.state === 'aim' && this.hint && !this.aim && !this.cancel) this.drawHint();
      this.drawTexts(dt);
      this.drawBanners(dt);
      this.drawConfetti(dt);
    }

    drawBanners(dt) {
      const ctx = this.ctx, s = this.scale;
      const cx = this.sx(0), cy = this.sy(TOP - H * 0.42);
      for (const b of this.banners) {
        b.t += dt;
        const k = b.t / b.life;
        // entra com um "pop", fica e some subindo
        const pop = k < 0.15 ? 0.6 + 0.4 * Math.sin(k / 0.15 * Math.PI / 2) * 1.08 : k < 0.25 ? 1.08 - (k - 0.15) * 0.8 : 1;
        const alpha = k > 0.75 ? Math.max(0, 1 - (k - 0.75) / 0.25) : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy - (k > 0.75 ? (k - 0.75) * 40 * this.dpr : 0));
        ctx.scale(pop, pop);
        ctx.rotate(-0.05);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${12 * s}px ${FONT_D}`;
        ctx.lineJoin = 'round'; ctx.lineWidth = 2.6 * s; ctx.strokeStyle = INK;
        ctx.strokeText(b.text, 0, s * 0.9);
        ctx.strokeText(b.text, 0, 0);
        ctx.fillStyle = b.color; ctx.fillText(b.text, 0, 0);
        if (b.sub) {
          ctx.font = `${5 * s}px ${FONT_D}`; ctx.lineWidth = 1.6 * s;
          ctx.strokeText(b.sub, 0, 9 * s); ctx.fillStyle = '#ffffff'; ctx.fillText(b.sub, 0, 9 * s);
        }
        ctx.restore();
      }
      this.banners = this.banners.filter((b) => b.t < b.life);
    }

    drawConfetti(dt) {
      const ctx = this.ctx, ch = this.canvas.height;
      for (const p of this.confetti) {
        p.t += dt; p.vy += 220 * this.dpr * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (p.life - p.t) * 2));
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.t * 8));
        ctx.fillStyle = p.c; rr(ctx, -p.w / 2, -p.h / 2, p.w, p.h, p.w * 0.25); ctx.fill();
        ctx.restore();
      }
      this.confetti = this.confetti.filter((p) => p.t < p.life && p.y < ch + 40);
    }

    // mãozinha mostrando o gesto de mirar (primeira partida)
    drawHint() {
      const ctx = this.ctx, g = this.game, s = this.scale;
      const t = (performance.now() / 1000) % 2.4;
      const k = Math.min(1, t / 1.4);
      const ease = 1 - Math.pow(1 - k, 3);
      const x0 = this.sx(g.launchX), y0 = this.sy(GROUND) - 4 * s;
      const x = x0 + ease * 22 * s, y = y0 - ease * 60 * s;
      const fade = t < 1.8 ? 1 : Math.max(0, 1 - (t - 1.8) / 0.4);
      ctx.save();
      ctx.globalAlpha = 0.85 * fade;
      ctx.setLineDash([s * 1.2, s * 1.6]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = s * 0.6;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(x, y, s * (3.6 + Math.sin(t * 6) * 0.4), 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, s * 1.6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${4.4 * s}px ${FONT}`;
      ctx.lineJoin = 'round'; ctx.lineWidth = s * 1.2; ctx.strokeStyle = 'rgba(15,10,45,0.8)';
      const msg = 'Arraste para mirar e solte';
      ctx.strokeText(msg, this.sx(0), this.sy(GROUND + CELL * 3.2)); ctx.fillStyle = '#ffffff'; ctx.fillText(msg, this.sx(0), this.sy(GROUND + CELL * 3.2));
      ctx.restore();
    }

    drawSnow(dt, fx, fy, fw, fh) {
      const ctx = this.ctx;
      if (this.snow.length < 60) this.snow.push({ x: Math.random(), y: Math.random(), v: 0.03 + Math.random() * 0.05 });
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (const f of this.snow) {
        f.y += f.v * dt; if (f.y > 1) { f.y = 0; f.x = Math.random(); }
        ctx.beginPath(); ctx.arc(fx + f.x * fw, fy + f.y * fh, this.scale * 0.5, 0, TAU); ctx.fill();
      }
    }

    screenPoly(e, off, inset) {
      const pts = this.game.poly(e).map(([x, y]) => [this.sx(x), this.sy(y - off)]);
      if (inset) {
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        for (const p of pts) { p[0] += (cx - p[0]) * inset; p[1] += (cy - p[1]) * inset; }
      }
      return pts;
    }
    // polígono com cantos arredondados
    roundPoly(pts, r) {
      const ctx = this.ctx, n = pts.length;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        if (i === 0) ctx.moveTo(m[0], m[1]);
        const nx = pts[(i + 2) % n];
        ctx.arcTo(q[0], q[1], (q[0] + nx[0]) / 2, (q[1] + nx[1]) / 2, r);
      }
      ctx.closePath();
    }

    drawBlock(e, now) {
      const ctx = this.ctx, g = this.game, s = this.scale;
      const shownHp = e.type === 'Share' ? g.share.hp : e.hp;
      const lockedLock = e.type === 'Lock' && g.elements.some((k) => k.id === e.keyId);
      const base = lockedLock ? LOCKED_RGB : blockRgb(e.type === 'Share' ? Math.max(1, g.share.hp) : e.hp, g.line);
      const off = (e.visRow - e.row) * CELL;
      const c = g.center(e);
      const cx = this.sx(c.x), cy = this.sy(c.y - off);
      const h = g.half(e) * s;
      const hitAge = this.hits.has(e.id) ? (now - this.hits.get(e.id)) / 1000 : 9;
      const hk = Math.max(0, 1 - hitAge / 0.16);
      const ghost = e.type === 'Transparent' && e.invisible;

      ctx.save();
      if (ghost) ctx.globalAlpha = 0.22;
      // leve "apertão" ao ser atingido
      if (hk > 0) { const k = 1 - 0.07 * Math.sin(hk * Math.PI); ctx.translate(cx, cy); ctx.scale(k + 0.02 * hk, k); ctx.translate(-cx, -cy); }
      const landAge = this.lands.has(e.id) ? (now - this.lands.get(e.id)) / 1000 : 9;
      if (landAge < 0.28) {
        // achata ao pousar e volta com uma sobra elástica
        const q = landAge / 0.28, amp = Math.sin(q * Math.PI * 2) * (1 - q) * 0.07;
        const by = cy + h;
        ctx.translate(cx, by); ctx.scale(1 + amp, 1 - amp); ctx.translate(-cx, -by);
      }

      if (e.type === 'Thorn') {
        ctx.fillStyle = '#2b2550';
        for (let i = 0; i < 4; i++) for (let k = -1; k <= 1; k++) {
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * Math.PI / 2);
          ctx.beginPath(); ctx.moveTo(k * h * 0.55 - h * 0.17, -h + s * 0.3); ctx.lineTo(k * h * 0.55, -h - s * 1.4); ctx.lineTo(k * h * 0.55 + h * 0.17, -h + s * 0.3); ctx.fill();
          ctx.restore();
        }
      }

      const pts = this.screenPoly(e, off);
      const tri = e.tri != null;
      const rad = (tri ? 0.12 : 0.18) * h;
      const depth = s * 0.9;
      // corpo (profundidade, face com gradiente, contorno, brilho) vem pronto do cache
      const body = this.blockBody(e, base, h, rad, depth, tri);
      ctx.drawImage(body, cx - body.width / 2, cy - body.height / 2);
      if (hk > 0) { this.roundPoly(pts, rad); ctx.fillStyle = `rgba(255,255,255,${0.35 * hk})`; ctx.fill(); }

      if (e.type === 'Double') { ctx.lineWidth = s * 0.7; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; this.roundPoly(this.screenPoly(e, off, 0.16), rad * 0.7); ctx.stroke(); }
      if (e.type === 'Split') { ctx.lineWidth = s * 0.5; ctx.strokeStyle = 'rgba(20,10,50,0.45)'; ctx.beginPath(); ctx.moveTo(cx - h * 0.1, cy - h); ctx.lineTo(cx + h * 0.15, cy - h * 0.35); ctx.lineTo(cx - h * 0.12, cy + h * 0.3); ctx.lineTo(cx + h * 0.05, cy + h); ctx.stroke(); }
      if (e.type === 'Share') { ctx.lineWidth = s * 0.55; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.setLineDash([s * 0.9, s * 0.7]); this.roundPoly(this.screenPoly(e, off, 0.1), rad * 0.8); ctx.stroke(); ctx.setLineDash([]); }
      if (e.type === 'Shield') {
        const t = s * 1.1, [top, right, bottom, left] = e.sides;
        const plate = (x, y, w, hh) => {
          rr(ctx, x, y, w, hh, Math.min(w, hh) / 2);
          const pg = ctx.createLinearGradient(x, y, x + w, y + hh); pg.addColorStop(0, '#f4f7ff'); pg.addColorStop(1, '#9aa6c8');
          ctx.fillStyle = pg; ctx.fill();
        };
        if (top) plate(cx - h, cy - h - t * 0.35, 2 * h, t);
        if (bottom) plate(cx - h, cy + h - t * 0.65 + depth, 2 * h, t);
        if (left) plate(cx - h - t * 0.35, cy - h, t, 2 * h + depth);
        if (right) plate(cx + h - t * 0.65, cy - h, t, 2 * h + depth);
      }

      // carinha
      const eyesOn = this.faces && !tri && !(e.type === 'Ice' && e.ice > 0);
      const numY = tri ? null : cy + h * (eyesOn ? 0.2 : 0.05);
      if (eyesOn) this.drawEyes(e, cx, cy, h, hk, now);

      if (e.type === 'Ice' && e.ice > 0) {
        this.roundPoly(pts, rad); ctx.fillStyle = 'rgba(190,235,255,0.72)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = s * 0.35; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = s * 0.3;
        ctx.beginPath(); ctx.moveTo(cx - h * 0.6, cy - h * 0.2); ctx.lineTo(cx - h * 0.25, cy - h * 0.6); ctx.moveTo(cx + h * 0.2, cy + h * 0.65); ctx.lineTo(cx + h * 0.6, cy + h * 0.25); ctx.stroke();
      }
      if (e.type === 'Prison') {
        ctx.strokeStyle = 'rgba(25,20,55,0.6)'; ctx.lineWidth = s * 0.6; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * h * 0.55, cy - h * 0.9); ctx.lineTo(cx + i * h * 0.55, cy + h * 0.9); ctx.stroke(); }
      }

      // HP
      let tx = cx, ty = numY;
      if (tri) {
        const p = g.poly(e);
        tx = this.sx(p.reduce((a, q) => a + q[0], 0) / 3);
        ty = this.sy(p.reduce((a, q) => a + q[1], 0) / 3 - off);
      }
      const str = String(Math.max(0, shownHp));
      const fs = (e.big ? 7.2 : tri ? 4.2 : 5) * s * (str.length > 3 ? 0.78 : str.length > 2 ? 0.9 : 1);
      const num = this.numberSprite(str, fs * 1.05, e.type === 'Ice' && e.ice > 0 ? '#2d6f99' : '#ffffff');
      ctx.drawImage(num, tx - num.width / 2, ty - num.height / 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      // selo do tipo especial
      const badge = { Key: 'key', Lock: lockedLock ? 'lock' : 'unlock', Drain: 'mouth', Recovery: 'plus', Heal: 'heart', Spread: 'burst', Rotation: 'rotate', Move: 'swap', Rush: 'chevrons', Share: 'link', Double: 'x2', Split: 'split' }[e.type];
      if (badge) {
        const R = (e.big ? 0.22 : 0.34) * h;
        const bx = cx + h * 0.82, by = cy - h * 0.82;
        ctx.fillStyle = '#ffffff';
        rr(ctx, bx - R * 1.05, by - R * 1.05, R * 2.1, R * 2.1, R * 0.45); ctx.fill();
        glyph(ctx, badge, bx, by, R * 1.05, rgb(base, 0.7));
      }
      if (e.type === 'Prison' && e.locked) {
        const R = 0.3 * h, bx = cx + h * 0.82, by = cy - h * 0.82;
        ctx.fillStyle = '#ffffff'; rr(ctx, bx - R, by - R, R * 2, R * 2, R * 0.45); ctx.fill();
        ctx.fillStyle = '#2b2550'; ctx.font = `700 ${R * 1.3}px ${FONT}`; ctx.fillText(String(e.locked), bx, by + R * 0.05);
      }
      if (e.type === 'Bubble' && e.bubble) {
        ctx.globalAlpha = ghost ? 0.2 : 0.5; ctx.strokeStyle = '#d4f6ff'; ctx.lineWidth = s * 0.55;
        ctx.fillStyle = 'rgba(190,240,255,0.16)';
        ctx.beginPath(); ctx.arc(cx, cy, h * 1.38, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(cx - h * 0.7, cy - h * 0.75, h * 0.16, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ---------------------------------------------------------- caches de desenho
    // corpo do bloco em coordenadas locais, reaproveitado entre quadros
    blockBody(e, base, h, rad, depth, tri) {
      const s = this.scale;
      const q = base.map((v) => v & 0xfc); // cores próximas dividem o mesmo sprite
      const key = `${tri ? e.tri : 'q'}|${e.big ? 1 : 0}|${q.join(',')}|${s.toFixed(3)}`;
      let c = this.bodyCache.get(key);
      if (c) return c;
      if (this.bodyCache.size > 500) this.bodyCache.clear();
      const pad = Math.ceil(depth + s * 1.2);
      const size = Math.ceil(h * 2 + pad * 2);
      c = document.createElement('canvas');
      c.width = c.height = size;
      const x = c.getContext('2d');
      const ctr = this.game.center(e);
      const pts = this.game.poly(e).map(([px, py]) => [size / 2 + (px - ctr.x) * s, size / 2 - (py - ctr.y) * s]);
      const saved = this.ctx;
      this.ctx = x; // roundPoly desenha em this.ctx
      x.save(); x.translate(0, depth);
      this.roundPoly(pts, rad); x.fillStyle = rgb(q, 0.58); x.fill();
      x.restore();
      this.roundPoly(pts, rad);
      const grd = x.createLinearGradient(0, size / 2 - h, 0, size / 2 + h);
      grd.addColorStop(0, rgb(q, 1.22)); grd.addColorStop(0.55, rgb(q)); grd.addColorStop(1, rgb(q, 0.86));
      x.fillStyle = grd; x.fill();
      x.lineWidth = Math.max(1, s * 0.42); x.strokeStyle = 'rgba(18,12,44,0.9)'; x.stroke();
      if (!tri) {
        x.fillStyle = 'rgba(255,255,255,0.22)';
        rr(x, size / 2 - h * 0.72, size / 2 - h * 0.86, h * 1.44, h * 0.2, h * 0.1); x.fill();
      }
      this.ctx = saved;
      this.bodyCache.set(key, c);
      return c;
    }
    // número com contorno, reaproveitado entre quadros
    numberSprite(str, px, color) {
      const s = this.scale;
      const key = `${str}|${px.toFixed(1)}|${color}`;
      let c = this.numCache.get(key);
      if (c) return c;
      if (this.numCache.size > 800) this.numCache.clear();
      const m = this.ctx; m.font = `${px}px ${FONT_D}`;
      const w = Math.ceil(m.measureText(str).width + s * 2.4), hh = Math.ceil(px * 1.5 + s);
      c = document.createElement('canvas');
      c.width = w; c.height = hh;
      const x = c.getContext('2d');
      x.font = `${px}px ${FONT_D}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineJoin = 'round'; x.lineWidth = s * 0.7; x.strokeStyle = 'rgba(18,12,44,0.75)';
      x.strokeText(str, w / 2, hh / 2 + s * 0.35);
      x.strokeText(str, w / 2, hh / 2);
      x.fillStyle = color; x.fillText(str, w / 2, hh / 2);
      this.numCache.set(key, c);
      return c;
    }
    // fundo + moldura do campo + pontinhos: só muda com tamanho/tema
    background() {
      const cw = this.canvas.width, ch = this.canvas.height, s = this.scale;
      const key = `${cw}x${ch}|${QK.theme.id}|${s.toFixed(3)}|${this.ox.toFixed(1)}|${this.oy.toFixed(1)}`;
      if (this.bgKey === key) return this.bg;
      const c = this.bg || document.createElement('canvas');
      c.width = cw; c.height = ch;
      const x = c.getContext('2d');
      this.backdrop.draw(x, cw, ch, 0);
      const fx = this.sx(LEFT), fy = this.sy(TOP), fw = W * s, fh = H * s, pad = 1.2 * s;
      x.save();
      rr(x, fx - pad, fy - pad, fw + pad * 2, fh + pad * 2 + s * 0.6, 1.6 * s);
      x.fillStyle = 'rgba(6,4,24,0.5)'; x.fill();
      x.strokeStyle = INK; x.lineWidth = Math.max(2, s * 0.7); x.stroke();
      x.clip();
      x.fillStyle = QK.theme.dots;
      for (let r = 1; r < ROWS; r++) for (let cc = 1; cc < COLS; cc++) {
        x.beginPath(); x.arc(this.sx(LEFT + cc * CELL), this.sy(TOP - r * CELL), s * 0.35, 0, TAU); x.fill();
      }
      x.restore();
      this.bg = c; this.bgKey = key;
      return c;
    }

    // olhinhos: piscam, olham para o lançador, se espremem ao apanhar e arregalam perto do chão
    drawEyes(e, cx, cy, h, hk, now) {
      const ctx = this.ctx, g = this.game;
      const ex = h * 0.34, ey = cy - h * 0.34, er = h * (e.big ? 0.09 : 0.13);
      const scared = e.row >= ROWS - 3;
      const ink = 'rgba(25,16,60,0.85)';
      ctx.lineCap = 'round'; ctx.lineWidth = er * 0.75; ctx.strokeStyle = ink; ctx.fillStyle = ink;
      const blink = ((now / 1000 + e.id * 0.737) % 4.3) < 0.13;
      if (this.mood === 'laugh') {
        // ^ ^ : os blocos comemoram
        const jig = Math.sin(now / 90 + e.id) * er * 0.25;
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * ex - er, ey + er * 0.5 + jig); ctx.lineTo(cx + sgn * ex, ey - er * 0.6 + jig); ctx.lineTo(cx + sgn * ex + er, ey + er * 0.5 + jig); ctx.stroke(); }
        return;
      }
      if (hk > 0.15 || e.type === 'Drain' && blink) {
        for (const sgn of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(cx + sgn * ex - sgn * er * 1.1, ey - er); ctx.lineTo(cx + sgn * ex + sgn * er * 0.6, ey); ctx.lineTo(cx + sgn * ex - sgn * er * 1.1, ey + er); ctx.stroke();
        }
        return;
      }
      if (blink) {
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * ex - er, ey); ctx.lineTo(cx + sgn * ex + er, ey); ctx.stroke(); }
        return;
      }
      // direção do olhar: a bola em voo mais próxima, ou o lançador
      let tx = this.sx(g.launchX), ty = this.sy(GROUND), bd = Infinity;
      for (const b of g.flying) {
        if (b.phase !== 'fly') continue;
        const bx = this.sx(b.x), by = this.sy(b.y), d2 = (bx - cx) ** 2 + (by - ey) ** 2;
        if (d2 < bd) { bd = d2; tx = bx; ty = by; }
      }
      const lx = tx - cx, ly = ty - ey;
      const ll = Math.hypot(lx, ly) || 1;
      if (scared) {
        for (const sgn of [-1, 1]) {
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx + sgn * ex, ey, er * 1.55, 0, TAU); ctx.fill();
          ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(cx + sgn * ex + lx / ll * er * 0.6, ey + ly / ll * er * 0.6, er * 0.75, 0, TAU); ctx.fill();
        }
        return;
      }
      const px = lx / ll * er * 0.35, py = ly / ll * er * 0.35;
      const hpNow = e.type === 'Share' ? g.share.hp : e.hp;
      if (e.maxHp >= 4 && hpNow <= e.maxHp * 0.25) {
        // cansado: pálpebra caída por cima da pupila
        for (const sgn of [-1, 1]) {
          ctx.fillStyle = ink;
          ctx.beginPath(); ctx.ellipse(cx + sgn * ex + px, ey + py + er * 0.25, er * 0.85, er * 0.75, 0, 0, Math.PI); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx + sgn * ex - er * 1.1, ey + er * 0.1); ctx.lineTo(cx + sgn * ex + er * 1.1, ey + er * 0.1 - sgn * er * 0.3); ctx.stroke();
        }
        return;
      }
      for (const sgn of [-1, 1]) {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.ellipse(cx + sgn * ex + px, ey + py, er * 0.85, er * 1.15, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(cx + sgn * ex + px - er * 0.25, ey + py - er * 0.4, er * 0.32, 0, TAU); ctx.fill();
      }
    }

    drawItem(e, now) {
      const ctx = this.ctx, g = this.game, s = this.scale;
      const c = g.center(e);
      const off = (e.visRow - e.row) * CELL;
      const x = this.sx(c.x), y = this.sy(c.y - off);
      const t = now / 1000;
      ctx.save();
      if (e.used) ctx.globalAlpha = 0.4;
      if (e.type === 'plus') {
        const pulse = 1 + 0.1 * Math.sin(t * 5 + e.id);
        ctx.fillStyle = 'rgba(109,255,176,0.14)';
        ctx.beginPath(); ctx.arc(x, y, QK.ITEM_R * s * pulse, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#6dffb0'; ctx.lineWidth = s * 0.55;
        ctx.setLineDash([s * 1.6, s * 0.9]); ctx.lineDashOffset = -t * 6 * s;
        ctx.beginPath(); ctx.arc(x, y, QK.ITEM_R * s * 0.82 * pulse, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#6dffb0'; ctx.beginPath(); ctx.arc(x, y, s * 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#0d3a26'; ctx.lineWidth = s * 0.45; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
      } else if (e.type === 'coin') {
        const sxk = Math.max(0.15, Math.abs(Math.cos(t * 2.4 + e.id)));
        ctx.translate(x, y); ctx.scale(sxk, 1);
        ctx.fillStyle = '#c48a00'; ctx.beginPath(); ctx.arc(0, s * 0.4, s * 3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, 0, s * 3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff3a0'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = (i % 2 ? 0.65 : 1.5) * s; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
        ctx.fill();
      } else {
        const col = e.type === 'spread' ? '#ffb347' : '#59e1ff';
        ctx.fillStyle = e.type === 'spread' ? 'rgba(255,179,71,0.14)' : 'rgba(89,225,255,0.14)';
        ctx.beginPath(); ctx.arc(x, y, QK.ITEM_R * s * 0.95, 0, TAU); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = s * 0.5;
        ctx.beginPath(); ctx.arc(x, y, QK.ITEM_R * s * 0.8, 0, TAU); ctx.stroke();
        ctx.lineWidth = s * 0.8; ctx.lineCap = 'round';
        ctx.beginPath();
        if (e.type === 'vlaser' || e.type === 'hlaser') {
          ctx.save(); ctx.translate(x, y); if (e.type === 'hlaser') ctx.rotate(Math.PI / 2);
          ctx.moveTo(0, -s * 2.6); ctx.lineTo(0, s * 2.6);
          ctx.moveTo(-s * 0.9, -s * 1.7); ctx.lineTo(0, -s * 2.6); ctx.lineTo(s * 0.9, -s * 1.7);
          ctx.moveTo(-s * 0.9, s * 1.7); ctx.lineTo(0, s * 2.6); ctx.lineTo(s * 0.9, s * 1.7);
          ctx.stroke(); ctx.restore();
        } else {
          for (let i = 0; i < 4; i++) { const a = t * 2 + i * Math.PI / 2; ctx.moveTo(x + Math.cos(a) * s * 0.8, y + Math.sin(a) * s * 0.8); ctx.lineTo(x + Math.cos(a) * s * 2.7, y + Math.sin(a) * s * 2.7); }
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawEffects(dt) {
      const ctx = this.ctx, s = this.scale;
      for (const f of this.fx) {
        f.t += dt;
        const k = 1 - f.t / f.life;
        if (k <= 0) continue;
        ctx.globalAlpha = Math.max(0, k);
        if (f.k === 'p') {
          f.x += f.vx * dt; f.y += f.vy * dt; f.vy -= 140 * dt; f.rot += f.vr * dt;
          const z = f.s * s * (0.5 + 0.5 * k);
          ctx.save(); ctx.translate(this.sx(f.x), this.sy(f.y)); ctx.rotate(f.rot);
          ctx.fillStyle = f.c; rr(ctx, -z / 2, -z / 2, z, z, z * 0.3); ctx.fill();
          ctx.restore();
        } else if (f.k === 'laser') {
          const w = (f.big ? 10 : 3.2) * s * k;
          // brilho falso: faixa larga translúcida + núcleo claro
          for (const [ww, col] of [[w * 3, 'rgba(89,225,255,0.25)'], [w, '#d8fbff']]) {
            ctx.fillStyle = col;
            if (f.axis === 'h') ctx.fillRect(this.sx(LEFT), this.sy(f.y) - ww / 2, W * s, ww);
            else ctx.fillRect(this.sx(f.x) - ww / 2, this.sy(TOP), ww, H * s);
          }
        } else if (f.k === 'ring') {
          ctx.strokeStyle = f.c; ctx.lineWidth = s * 0.7 * k + s * 0.2;
          ctx.beginPath(); ctx.arc(this.sx(f.x), this.sy(f.y), (1 - k) * (f.big ? 18 : 10) * s + 2 * s, 0, TAU); ctx.stroke();
        } else if (f.k === 'rocket') {
          const p = 1 - k;
          ctx.strokeStyle = '#ff9a1f'; ctx.lineWidth = s * 1.2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(this.sx(f.x), this.sy(f.y)); ctx.lineTo(this.sx(f.x + (f.tx - f.x) * p), this.sy(f.y + (f.ty - f.y) * p)); ctx.stroke();
        } else if (f.k === 'hole') {
          ctx.fillStyle = '#05040f'; ctx.strokeStyle = '#9b59ff'; ctx.lineWidth = s;
          ctx.beginPath(); ctx.arc(this.sx(f.x), this.sy(f.y), 9 * s * Math.sin(k * Math.PI), 0, TAU); ctx.fill(); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      this.fx = this.fx.filter((f) => f.t < f.life);
    }

    drawTexts(dt) {
      const ctx = this.ctx, s = this.scale;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of this.texts) {
        t.t += dt;
        const k = t.t / t.life;
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        ctx.font = `${(4.4 + 1.2 * Math.min(1, k * 5)) * s}px ${FONT_D}`;
        ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.9; ctx.strokeStyle = INK;
        ctx.strokeText(t.s, this.sx(t.x), this.sy(t.y + t.t * 12));
        ctx.fillStyle = t.c; ctx.fillText(t.s, this.sx(t.x), this.sy(t.y + t.t * 12));
      }
      ctx.globalAlpha = 1;
      this.texts = this.texts.filter((t) => t.t < t.life);
    }

    countPill(text, x, y, dim) {
      const ctx = this.ctx, s = this.scale;
      ctx.font = `${3.9 * s}px ${FONT_D}`;
      const w = ctx.measureText(text).width + s * 3.4, h = s * 5.2;
      rr(ctx, x - w / 2, y, w, h, s * 1.3);
      ctx.fillStyle = dim ? '#1a1640' : (QK.theme.ui ? QK.theme.ui[0] : '#2f2b70'); ctx.fill();
      ctx.lineWidth = Math.max(1.5, s * 0.45); ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = dim ? '#a9a6d6' : '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + h / 2 + s * 0.15);
    }

    drawLauncher() {
      const ctx = this.ctx, g = this.game, s = this.scale;
      const gy = this.sy(GROUND);
      const py = gy + s * 1.6;
      if (g.state === 'aim' || g.state === 'over' || g.state === 'resolve') {
        const skin = g.skin, pr = QK.BALL_R * skin.size * s;
        const spr = ballSprite(skin, pr);
        ctx.drawImage(spr, this.sx(g.launchX) - spr.width / 2, gy - pr - spr.height / 2);
        this.countPill('x' + g.availableBalls, this.sx(g.launchX), py);
        if (this.cancel && g.state === 'aim') {
          const cx = this.sx(g.launchX), cy = gy - pr;
          ctx.strokeStyle = '#ff5c7c'; ctx.lineWidth = s * 0.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(cx, cy, s * 3.4, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - s * 1.6, cy - s * 1.6); ctx.lineTo(cx + s * 1.6, cy + s * 1.6); ctx.moveTo(cx + s * 1.6, cy - s * 1.6); ctx.lineTo(cx - s * 1.6, cy + s * 1.6); ctx.stroke();
          ctx.font = `600 ${3.8 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ff9db0'; ctx.fillText('Solte para cancelar', cx, cy - s * 6.5);
        }
      } else if (g.state === 'shoot') {
        if (g.toLaunch > 0) this.countPill('x' + g.toLaunch, this.sx(g.launchX), py);
        if (g.nextX != null && g.returned > 0) {
          const spr = ballSprite(g.skin, QK.BALL_R * g.skin.size * s);
          ctx.drawImage(spr, this.sx(g.nextX) - spr.width / 2, gy - QK.BALL_R * s - spr.height / 2);
          if (g.toLaunch === 0 || Math.abs(g.nextX - g.launchX) > 8) this.countPill('x' + g.returned, this.sx(g.nextX), py, true);
        }
      }
    }

    drawAim() {
      const ctx = this.ctx, g = this.game, s = this.scale;
      const long = g.opts.longAim;
      const pts = g.aimPath(this.aim, long ? 1 + QK.V.longAimBounces : 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(this.sx(LEFT), this.sy(TOP), W * s, H * s); ctx.clip();
      const step = 3.4;
      let acc = 0, dist = 0;
      const tOff = (performance.now() / 1000 * 8) % step;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        ctx.fillStyle = long && i > 0 ? '#ffd23f' : '#ffffff';
        for (let d = acc + tOff; d < len; d += step) {
          const tt = d / len;
          const fade = Math.max(0.25, 1 - (dist + d) / 260);
          ctx.globalAlpha = 0.9 * fade;
          ctx.beginPath(); ctx.arc(this.sx(a.x + (b.x - a.x) * tt), this.sy(a.y + (b.y - a.y) * tt), s * (0.42 + 0.3 * fade), 0, TAU); ctx.fill();
        }
        dist += len;
        acc = (acc - len) % step; if (acc < 0) acc += step;
      }
      // bola fantasma no primeiro contato
      if (pts.length > 1) {
        const p = pts[1];
        ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.35;
        ctx.beginPath(); ctx.arc(this.sx(p.x), this.sy(p.y), QK.BALL_R * g.skin.size * s, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Miniatura de um bloco/item (guia). spec: { type, kind?, extra? }
  QK.drawElementPreview = function (canvas, spec) {
    const g = new QK.Game({ specials: false, rng: () => 0.5 });
    g.elements = []; g.grid.clear(); g.line = 40; g.launchX = 0;
    const col = 3, row = 5, hp = spec.hp || QK.lineHp(40);
    let e;
    if (spec.kind === 'item') e = g.mkItem(spec.type, col, row);
    else {
      e = g.mk(spec.type, col, row, hp, spec.extra || {});
      if (spec.type === 'Share') { g.share = { hp, max: hp }; }
      if (spec.type === 'Lock') { const k = g.mk('Key', 0, 9, hp); e.keyId = k.id; }
    }
    e.visRow = e.row;
    const r = new Renderer(canvas, g);
    const span = e.big ? CELL * 2.5 : e.kind === 'item' ? CELL * 0.75 : CELL * 1.45;
    r.scale = canvas.width / span;
    const c = g.center(e);
    r.ox = canvas.width / 2 - (c.x - LEFT) * r.scale;
    r.oy = canvas.height / 2 - (TOP - c.y) * r.scale;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (e.kind === 'item') r.drawItem(e, 1200); else r.drawBlock(e, 1200);
  };

  // Miniatura de um tema: fundo + alguns blocos com a rampa de cor
  QK.drawThemePreview = function (canvas, theme) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, theme.bg[0]); g.addColorStop(0.55, theme.bg[1]); g.addColorStop(1, theme.bg[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = theme.float[0];
    ctx.beginPath(); ctx.arc(w * 0.85, h * 0.2, w * 0.12, 0, TAU); ctx.fill();
    rr(ctx, w * 0.06, h * 0.7, w * 0.14, w * 0.14, w * 0.03); ctx.fill();
    const cell = w / 5.2, size = cell * 0.86, x0 = (w - cell * 4) / 2 + (cell - size) / 2;
    const layout = [[6, 5, -1, 4], [3, -1, 5, 2], [-1, 1, 2, 0]];
    layout.forEach((row, r) => row.forEach((ci, c) => {
      if (ci < 0) return;
      const x = x0 + c * cell, y = h * 0.14 + r * cell;
      const base = hex(theme.ramp[ci]);
      rr(ctx, x, y + size * 0.08, size, size, size * 0.18); ctx.fillStyle = rgb(base, 0.58); ctx.fill();
      rr(ctx, x, y, size, size, size * 0.18); ctx.fillStyle = rgb(base); ctx.fill();
      ctx.fillStyle = 'rgba(25,16,60,0.85)';
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + size / 2 + sgn * size * 0.17, y + size * 0.38, size * 0.06, size * 0.08, 0, 0, TAU); ctx.fill(); }
    }));
    ctx.fillStyle = `rgba(${theme.ground},0.8)`; ctx.fillRect(w * 0.08, h * 0.88, w * 0.84, Math.max(2, h * 0.012));
    const bx = w * 0.5, by = h * 0.84, br = w * 0.045;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
  };

  QK.Renderer = Renderer;
  QK.blockColor = blockColor;
})(window);
