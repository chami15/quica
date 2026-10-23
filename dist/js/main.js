// Interface: abas, pop-ups, HUD, entrada (mouse/toque), salvamento.
(function () {
  const QK = window.QK;
  const V = QK.V;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ------------------------------------------------------------ armazenamento
  const KEY = 'quica.';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } },
    del(k) { try { localStorage.removeItem(KEY + k); } catch (e) { /* ignore */ } },
  };
  const settings = Object.assign({
    aimMode: 'touch',          // 'touch' = mira no dedo | 'sling' = estilingue (puxa para trás)
    longAim: false,
    sound: true,
    music: true,
    haptics: true,
    specials: true,
    unlimitedItems: false,
    ballId: 1,
    theme: 'noite',
    shake: !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    faces: true,
    boosters: { addball: false, rocket: false, blackhole: false },
  }, store.get('settings', {}));
  const saveSettings = () => store.set('settings', settings);
  let wallet = store.get('wallet', 0);
  let best = store.get('best', 0);
  const seen = new Set(store.get('seen', []));

  QK.sfx.enabled = settings.sound;
  QK.music.enabled = settings.music;
  QK.haptics.enabled = settings.haptics;
  QK.fitIcons();
  QK.hydrateIcons();

  const app = $('app');
  const canvas = $('cv');
  let game = null;
  let view = 'home';
  let recordToastShown = false;
  const renderer = new QK.Renderer(canvas, null);
  const homeStage = new QK.BallStage($('home-stage'));
  const loaderScene = new QK.LoaderScene($('loader-scene'));
  const ballsStage = new QK.BallStage($('balls-stage'));
  renderer.shakeOn = settings.shake;
  renderer.faces = settings.faces;
  // estatísticas da partida atual (resumo no fim de jogo)
  let run = store.get('run', { broken: 0, bestCombo: 0 });
  let turnBreaks = 0;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function applyTheme() {
    QK.theme = QK.themeById(settings.theme);
    const th = QK.theme, css = document.documentElement.style;
    css.setProperty('--panel', th.ui[0]); css.setProperty('--panel2', th.ui[1]); css.setProperty('--well', th.ui[2]);
    th.bg.forEach((c, i) => css.setProperty('--th' + i, c));
    [0, 1, 3, 4, 6].forEach((k, i) => css.setProperty('--l' + (i + 1), th.ramp[k]));
    css.setProperty('--la', th.ramp[3]); css.setProperty('--lb', th.ramp[2]); // cores dos blocos no campo
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', QK.theme.bg[1]);
  }
  applyTheme();
  QK._ui = { renderer }; // usado pelos testes automáticos

  // ------------------------------------------------------------ layout
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  function layout() {
    const cs = getComputedStyle(probe);
    const st = parseFloat(cs.paddingTop) || 0, sb = parseFloat(cs.paddingBottom) || 0;
    renderer.resize(app.clientWidth, app.clientHeight, 66 + st, 90 + sb);
  }
  window.addEventListener('resize', layout);
  if (window.visualViewport) visualViewport.addEventListener('resize', layout); // barra do navegador no celular
  layout();

  // ------------------------------------------------------------ toque/feedback
  function tap(kind) {
    QK.sfx.unlock();
    QK.sfx.play(kind || 'click');
    QK.haptics.buzz(8);
  }
  // Aviso padrão: aparece sobre a barra do topo, longe do campo de lançamento.
  // Mesmo formato e mesma duração para todos; um toque dispensa.
  const NOTIFY_MS = 2500;
  let toastTimer = 0;
  function notify(o) {
    const t = $('toast');
    const media = o.preview ? '<canvas width="88" height="88"></canvas>' : QK.icon(o.icon || 'info');
    t.innerHTML = `<span class="nt-ico${o.preview ? ' prev' : ''}">${media}</span>` +
      `<span class="nt-body"><b>${o.title}</b>${o.text ? `<span class="nt-text">${o.text}</span>` : ''}` +
      `${o.meta ? `<span class="nt-meta${o.warn ? ' warn' : ''}">${o.meta}</span>` : ''}</span>`;
    if (o.preview) QK.drawElementPreview(t.querySelector('canvas'), o.preview);
    t.classList.remove('out');
    t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideNotify, NOTIFY_MS);
  }
  function hideNotify() {
    const t = $('toast');
    if (t.hidden) return;
    t.classList.add('out');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; t.classList.remove('out'); }, 200);
  }
  $('toast').addEventListener('pointerdown', (ev) => { ev.stopPropagation(); hideNotify(); });

  // ------------------------------------------------------------ pop-ups (pilha)
  const stack = [];
  function openPop(id) {
    if (stack.length) $(stack[stack.length - 1]).hidden = true;
    stack.push(id);
    $(id).hidden = false;
  }
  function closePop() {
    const id = stack.pop();
    if (id) $(id).hidden = true;
    if (stack.length) $(stack[stack.length - 1]).hidden = false;
  }
  function clearPops() { while (stack.length) $(stack.pop()).hidden = true; }
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => { tap(); closePop(); }));
  $$('.pop').forEach((p) => p.addEventListener('pointerdown', (ev) => {
    // toque fora do cartão fecha (menos pausa e fim de jogo)
    if (ev.target === p && p.id !== 'pop-over' && p.id !== 'pop-pause' && stack[stack.length - 1] === p.id) { tap(); closePop(); }
  }));
  const paused = () => stack.length > 0;

  function confirmBox(title, text, yes, onYes) {
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    const b = $('confirm-yes');
    b.textContent = yes;
    b.onclick = () => { tap(); closePop(); onYes(); };
    openPop('pop-confirm');
  }

  // ------------------------------------------------------------ abas
  function setView(v) {
    view = v;
    $('view-home').hidden = v !== 'home';
    $('view-balls').hidden = v !== 'balls';
    $('nav').hidden = v === 'game';
    $('hud-top').hidden = $('hud-bottom').hidden = v !== 'game';
    $$('.nav-btn').forEach((b) => b.classList.toggle('on', b.dataset.tab === v));
    if (v === 'home') refreshHome();
    if (v === 'balls') openBalls();
    refreshCoins();
  }
  $$('.nav-btn').forEach((b) => b.addEventListener('click', () => {
    const tab = b.dataset.tab;
    if (tab === 'modes') { tap(); notify({ icon: 'modes', title: 'Modos de jogo', text: 'Chegando em breve!' }); return; }
    if (tab !== view) { tap('select'); setView(tab); }
  }));

  function savedGame() {
    const s = store.get('save', null);
    if (!s) return null;
    try { return { raw: s, line: JSON.parse(s).line }; } catch (e) { return null; }
  }
  function refreshHome() {
    $('home-best').textContent = best;
    const sv = savedGame();
    $('play-label').textContent = sv ? 'Continuar' : 'Jogar';
    $('play-sub').textContent = sv ? `linha ${sv.line}` : '';
    $('btn-new').hidden = !sv;
    homeStage.setSkin(QK.ballById(settings.ballId));
  }
  function refreshCoins() {
    $$('.js-coins').forEach((el) => (el.textContent = wallet));
  }

  // ------------------------------------------------------------ partida
  function startGame(saved) {
    game = new QK.Game({
      ballId: settings.ballId,
      boosters: Object.assign({}, settings.boosters),
      specials: settings.specials,
      actionCharges: settings.unlimitedItems ? -1 : 3,
      longAim: settings.longAim,
      wallet,
    });
    if (saved) game.load(saved);
    else { run = { broken: 0, bestCombo: 0 }; store.set('run', run); }
    renderer.setGame(game);
    renderer.hint = !store.get('tutorial', false);
    QK.music.setTension(false);
    game.on(onGameEvent);
    clearPops();
    recordToastShown = game.line > best;
    setView('game');
    buildActions();
    refreshHud();
    if (!saved) store.set('save', game.serialize());
  }

  function persist() {
    wallet = game.wallet;
    store.set('wallet', wallet);
    if (game.line > best) { best = game.line; store.set('best', best); }
  }

  function onGameEvent(t, d) {
    renderer.onEvent(t, d);
    if (t === 'shoot') {
      turnBreaks = 0;
      if (renderer.hint) { renderer.hint = false; store.set('tutorial', true); }
    }
    if (t === 'break' && d.e && d.e.kind === 'block') { turnBreaks++; run.broken++; }
    if (t !== 'launch') QK.sfx.play(t, turnBreaks - 1);
    if (t === 'break') QK.haptics.buzz(12, 'break', 70);
    if (t === 'plus') QK.haptics.buzz(6, 'plus', 60);
    if (t === 'shoot') QK.haptics.buzz(10);
    if (t === 'coin') { QK.haptics.buzz([8, 30, 8]); refreshHud(); }
    if (t === 'turn' || t === 'continue') {
      const wasBest = best;
      persist();
      store.set('save', game.serialize());
      refreshHud(true);
      announceNewBlocks();
      if (game.line === V.toolsUnlockLine) notify({ icon: 'star', title: 'Ferramentas liberadas!', text: 'Toque em uma lá embaixo para ver o que faz.' });
      if (t === 'turn') celebrate(wasBest);
      QK.music.setTension(game.blocks().some((e) => e.row >= QK.ROWS - 3));
      if (t === 'turn') setTimeout(() => QK.sfx.play('land'), 160);
    }
    if (t === 'gameover') {
      QK.haptics.buzz([60, 40, 90]);
      QK.music.duck(2.5);
      QK.music.setTension(false);
      persist();
      store.del('save');
      setTimeout(showGameOver, 500);
    }
  }

  // uma comemoração por rodada, da mais importante para a menos
  function celebrate(wasBest) {
    run.bestCombo = Math.max(run.bestCombo, turnBreaks);
    store.set('run', run);
    const praise = QK.PRAISE.find((p) => turnBreaks >= p.min);
    if (!recordToastShown && wasBest > 0 && game.line > wasBest) {
      recordToastShown = true;
      renderer.banner('Novo recorde!', '#ffd23f', `linha ${game.line}`);
      renderer.burst(90);
      QK.sfx.play('record'); QK.music.duck(1.2); QK.haptics.buzz([20, 40, 20, 40, 60]);
    } else if (game.line % QK.MILESTONE_EVERY === 0) {
      renderer.banner(`Linha ${game.line}!`, '#6dffb0', pick(['Continue assim', 'Que fôlego!', 'Os blocos estão com medo']));
      renderer.burst(60);
      QK.sfx.play('record'); QK.haptics.buzz([20, 40, 40]);
    } else if (praise) {
      renderer.banner(praise.text, praise.color, `${turnBreaks} blocos de uma vez`);
      QK.sfx.play('praise'); QK.haptics.buzz(25);
    }
  }

  function specialKeyOf(e) {
    if (e.type === 'Key' || e.type === 'Lock') return 'LockKey';
    if (e.type === 'Shield') return ['', 'Shield', 'Shield2', 'Shield3'][e.sides.filter(Boolean).length];
    return e.type;
  }
  function announceNewBlocks() {
    for (const e of game.blocks()) {
      const k = specialKeyOf(e);
      const sp = QK.SPECIAL.find((s) => s.key === k);
      if (!sp || seen.has(k)) continue;
      seen.add(k);
      store.set('seen', [...seen]);
      notify({ preview: previewSpec(sp.key), title: `Novo: ${sp.name}`, text: QK.SPECIAL_DESC[k] });
      break;
    }
  }

  function refreshHud(bump) {
    if (!game) return;
    const hl = $('hud-line');
    if (hl.textContent !== String(game.line)) {
      hl.textContent = game.line;
      if (bump) { hl.classList.remove('bump'); void hl.offsetWidth; hl.classList.add('bump'); }
    }
    $('hud-best').textContent = Math.max(best, game.line);
    $('hud-coins').textContent = game.wallet;
    refreshActions();
  }

  // ------------------------------------------------------- ferramentas
  function buildActions() {
    const box = $('actions');
    box.innerHTML = '';
    for (const a of QK.ACTIONS) {
      const b = document.createElement('button');
      b.className = 'act';
      b.dataset.k = a.key;
      b.setAttribute('aria-label', a.name);
      b.innerHTML = QK.icon(a.icon) + '<span class="cnt"></span>';
      b.addEventListener('click', () => {
        tap();
        if (!game.actionsUnlocked()) { toolInfo(a, `Libera na linha ${V.toolsUnlockLine}`, true); return; }
        if (game.charges[a.key] === 0) { toolInfo(a, 'Sem usos nesta partida', true); return; }
        if (game.state !== 'aim') { toolInfo(a, 'Use antes de disparar'); return; }
        if (game.useAction(a.key)) { QK.haptics.buzz(20); toolInfo(a, 'Ativado!'); refreshActions(); }
      });
      box.appendChild(b);
    }
  }
  // cartão com ícone, nome, descrição e situação da ferramenta
  function toolInfo(a, status, locked) {
    const left = game.charges[a.key];
    const uses = left < 0 ? 'Usos ilimitados' : `${left} ${left === 1 ? 'uso restante' : 'usos restantes'}`;
    notify({ icon: a.icon, title: a.name, text: a.desc, meta: `${status} · ${uses}`, warn: locked });
  }
  function refreshActions() {
    if (!game) return;
    const unlocked = game.actionsUnlocked();
    $$('.act').forEach((b) => {
      const k = b.dataset.k, c = game.charges[k];
      b.classList.toggle('locked', !unlocked || c === 0);
      b.classList.toggle('armed', (k === 'pad' && !!game.pad) || (k === 'super' && game.superShot));
      const cnt = b.querySelector('.cnt');
      if (!unlocked) { if (!cnt.querySelector('svg')) cnt.innerHTML = QK.icon('lock'); }
      else cnt.textContent = c < 0 ? '∞' : c;
    });
  }

  // ------------------------------------------------------------ entrada
  let aiming = false, slingStart = null;
  function aimFrom(ev) {
    const r = canvas.getBoundingClientRect();
    const p = renderer.toWorld(ev.clientX - r.left, ev.clientY - r.top);
    const by = QK.GROUND + QK.BALL_R;
    if (settings.aimMode === 'sling') {
      const dx = slingStart.x - p.x, dy = slingStart.y - p.y;
      if (Math.hypot(dx, dy) < 4 || dy <= 0) return null;
      return game.clampDir(dx, dy);
    }
    if (p.y < by + 1) return null; // dedo abaixo do chão = cancelar
    return game.clampDir(p.x - game.launchX, p.y - by);
  }
  const canAim = () => view === 'game' && game && !paused() && game.state === 'aim';
  canvas.addEventListener('pointerdown', (ev) => {
    QK.sfx.unlock();
    if (!canAim()) return;
    canvas.setPointerCapture(ev.pointerId);
    aiming = true;
    const r = canvas.getBoundingClientRect();
    slingStart = renderer.toWorld(ev.clientX - r.left, ev.clientY - r.top);
    renderer.aim = settings.aimMode === 'sling' ? null : aimFrom(ev);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!aiming) return;
    renderer.aim = aimFrom(ev);
    renderer.cancel = settings.aimMode === 'touch' && !renderer.aim;
  });
  const endAim = (ev, cancel) => {
    if (!aiming) return;
    aiming = false;
    const dir = cancel ? null : aimFrom(ev);
    renderer.aim = null;
    renderer.cancel = false;
    if (dir && game.state === 'aim') {
      game.shoot(dir);
      refreshActions();
    }
  };
  canvas.addEventListener('pointerup', (ev) => endAim(ev, false));
  canvas.addEventListener('pointercancel', (ev) => endAim(ev, true));

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (stack.length && stack[stack.length - 1] !== 'pop-over') { closePop(); return; }
      if (view === 'game') openPause();
      return;
    }
    if (view !== 'game' || paused() || !game) return;
    if (ev.key === ' ' || ev.key === 'r') game.recall();
    if (ev.key === 'f') game.speedUp();
  });

  $('btn-speed').addEventListener('click', () => { game.speedUp(); tap(); });
  $('btn-recall').addEventListener('click', () => { game.recall(); tap(); });

  // ------------------------------------------------------------ pausa / fim
  function openPause() {
    if (!game || game.state === 'over' || paused()) return;
    openPop('pop-pause');
  }
  $('btn-pause').addEventListener('click', () => { tap(); openPause(); });
  $('btn-resume').addEventListener('click', () => { tap(); clearPops(); });
  $('btn-pause-settings').addEventListener('click', () => { tap(); openSettings(); });
  $('btn-restart').addEventListener('click', () => {
    tap();
    confirmBox('Recomeçar?', 'A partida atual será perdida.', 'Recomeçar', () => { clearPops(); openBoosters(); });
  });
  function leaveToHome() {
    if (game) {
      if (game.state === 'shoot') { // termina o disparo antes de salvar
        game.recall();
        for (let i = 0; i < 2000 && game.state === 'shoot'; i++) game.update(0.05);
      }
      if (game.state === 'aim') store.set('save', game.serialize());
      persist();
    }
    game = null;
    renderer.setGame(null);
    QK.music.setTension(false);
    clearPops();
    setView('home');
  }
  $('btn-tohome').addEventListener('click', () => { tap(); leaveToHome(); });

  function showGameOver() {
    if (!game) return;
    $('over-title').textContent = pick(QK.OVER_TITLES);
    $('over-line').textContent = game.line;
    const stat = (icon, v, label) => `<div>${QK.icon(icon)}<b>${v}</b><span>${label}</span></div>`;
    $('over-stats').innerHTML = stat('blocksbroken', run.broken, 'blocos') + stat('combo', run.bestCombo, 'melhor jogada') + stat('balls', game.balls, 'bolinhas');

    const ob = $('over-best');
    const isRecord = game.line >= best && game.line > 1;
    ob.innerHTML = QK.icon('trophy') + (isRecord ? 'Novo recorde!' : `Recorde ${best}`);
    ob.classList.toggle('new', isRecord);
    if (isRecord) QK.sfx.play('record');
    $('btn-cont-free').hidden = game.freeContinueUsed;
    const cost = game.continueCost();
    $('cont-cost').textContent = `Continuar por ${cost}`;
    $('btn-cont-coin').disabled = game.wallet < cost;
    clearPops();
    openPop('pop-over');
  }
  const doCont = (free) => {
    tap();
    if (game.doContinue(free)) { clearPops(); persist(); refreshHud(); notify({ icon: 'restart', title: 'Segunda chance!', text: 'As 3 linhas de baixo sumiram.' }); }
  };
  $('btn-cont-free').addEventListener('click', () => doCont(true));
  $('btn-cont-coin').addEventListener('click', () => doCont(false));
  $('btn-again').addEventListener('click', () => { tap(); openBoosters(); });
  $('btn-over-home').addEventListener('click', () => { tap(); game = null; renderer.setGame(null); clearPops(); setView('home'); });

  // ------------------------------------------------------------ início
  $('btn-play').addEventListener('click', () => {
    tap('select');
    const sv = savedGame();
    if (sv) loadThen(() => startGame(sv.raw)); else openBoosters();
  });
  $('btn-new').addEventListener('click', () => {
    tap();
    confirmBox('Nova partida?', 'A partida salva será descartada.', 'Começar do zero', () => { store.del('save'); refreshHome(); openBoosters(); });
  });
  $('btn-help').addEventListener('click', () => { tap(); openGuide(); });
  $$('.js-settings').forEach((b) => b.addEventListener('click', () => { tap(); openSettings(); }));

  function openBoosters() {
    const list = $('boost-list');
    list.innerHTML = '';
    for (const bo of QK.BOOSTERS) {
      const b = document.createElement('button');
      b.className = 'card' + (settings.boosters[bo.key] ? ' on' : '');
      b.innerHTML = `<span class="bico">${QK.icon(bo.icon === 'balls' ? 'ballsplus' : bo.icon)}</span><span><div class="t">${bo.name}</div><div class="d">${bo.desc}</div></span><span class="sw"></span>`;
      b.addEventListener('click', () => {
        tap();
        settings.boosters[bo.key] = !settings.boosters[bo.key];
        b.classList.toggle('on', settings.boosters[bo.key]);
        saveSettings();
      });
      list.appendChild(b);
    }
    openPop('pop-boost');
  }
  $('btn-start').addEventListener('click', () => { tap('select'); store.del('save'); clearPops(); loadThen(() => startGame(null)); });

  // ------------------------------------------------------------ ajustes
  function openSettings() {
    const list = $('settings-list');
    list.innerHTML = '';
    const row = (icon, title, desc, end, onClick, cls) => {
      const b = document.createElement(onClick ? 'button' : 'div');
      b.className = 'set-row' + (cls ? ' ' + cls : '');
      b.innerHTML = `<span class="sico">${QK.icon(icon)}</span><span><div class="t">${title}</div>${desc ? `<div class="d">${desc}</div>` : ''}</span><span class="end"></span>`;
      if (end) b.querySelector('.end').appendChild(end);
      if (onClick) b.addEventListener('click', () => onClick(b));
      list.appendChild(b);
      return b;
    };
    const toggle = (icon, title, desc, key, apply) => {
      const s = document.createElement('span');
      s.className = 'sw' + (settings[key] ? ' on' : '');
      row(icon, title, desc, s, () => {
        settings[key] = !settings[key];
        s.classList.toggle('on', settings[key]);
        saveSettings();
        if (apply) apply(settings[key]);
        tap();
      });
    };
    toggle('music', 'Música', '', 'music', (v) => { QK.music.enabled = v; QK.music.sync(); });
    toggle('sound', 'Efeitos sonoros', '', 'sound', (v) => { QK.sfx.enabled = v; });
    toggle('vibrate', 'Vibração', navigator.vibrate ? '' : 'Sem suporte neste aparelho', 'haptics', (v) => { QK.haptics.enabled = v; if (v) QK.haptics.buzz(30); });

    const aimDesc = (m) => (m === 'touch' ? 'A bola vai na direção do dedo' : 'Puxe para trás e solte');
    const seg = document.createElement('div');
    seg.className = 'seg';
    const aimRow = row('aim', 'Mira', aimDesc(settings.aimMode), seg, null);
    for (const [mode, icon, label] of [['touch', 'finger', 'Mirar no dedo'], ['sling', 'sling', 'Estilingue']]) {
      const b = document.createElement('button');
      b.className = settings.aimMode === mode ? 'on' : '';
      b.setAttribute('aria-label', label);
      b.innerHTML = QK.icon(icon);
      b.addEventListener('click', () => {
        settings.aimMode = mode; saveSettings(); tap();
        seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        aimRow.querySelector('.d').textContent = aimDesc(mode);
      });
      seg.appendChild(b);
    }
    toggle('shake', 'Tremer a tela', 'Em impactos grandes e no fim de jogo', 'shake', (v) => { renderer.shakeOn = v; });
    toggle('face', 'Carinhas nos blocos', 'Olhinhos que reagem às bolas', 'faces', (v) => { renderer.faces = v; });
    toggle('star', 'Mira longa', `Mostra ${V.longAimBounces} ricochetes`, 'longAim', (v) => { if (game) game.opts.longAim = v; });
    toggle('blocks', 'Blocos especiais', 'Vale na próxima partida', 'specials');
    toggle('infinity', 'Ferramentas ilimitadas', 'Desligado: 3 usos de cada', 'unlimitedItems');
    row('trash', 'Apagar progresso', 'Recorde, moedas e blocos vistos', null, () => {
      tap();
      confirmBox('Apagar progresso?', 'Recorde, moedas e blocos já vistos serão zerados.', 'Apagar', () => {
        store.del('best'); store.del('wallet'); store.del('seen'); best = 0; wallet = 0; seen.clear();
        if (game) game.wallet = 0;
        refreshCoins(); refreshHome(); refreshHud();
        notify({ icon: 'trash', title: 'Progresso apagado', text: 'Recorde, moedas e blocos vistos foram zerados.' });
      });
    }, 'danger');
    openPop('pop-settings');
  }

  // ------------------------------------------------------------ coleção: bolinhas | temas
  let section = 'balls';
  $$('.seg-tabs button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.sec === section) return;
    tap('select');
    section = b.dataset.sec;
    $$('.seg-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    $('sec-balls').hidden = section !== 'balls';
    $('sec-themes').hidden = section !== 'themes';
    if (section === 'themes') openThemes();
  }));
  let themesBuilt = false;
  function openThemes() {
    const grid = $('sec-themes');
    if (!themesBuilt) {
      themesBuilt = true;
      for (const th of QK.THEMES) {
        const b = document.createElement('button');
        b.className = 'theme-card';
        b.dataset.id = th.id;
        b.innerHTML = `<canvas width="240" height="240"></canvas><div class="tn">${th.name}</div><div class="td">${th.desc}</div>`;
        QK.drawThemePreview(b.querySelector('canvas'), th);
        b.addEventListener('click', () => {
          tap('select');
          settings.theme = th.id; saveSettings(); applyTheme();
          markTheme();
        });
        grid.appendChild(b);
      }
    }
    markTheme();
  }
  function markTheme() {
    $$('.theme-card').forEach((c) => {
      const on = c.dataset.id === settings.theme;
      c.classList.toggle('sel', on);
      const tn = c.querySelector('.tn');
      const ico = tn.querySelector('svg');
      if (on && !ico) tn.insertAdjacentHTML('afterbegin', QK.icon('check'));
      if (!on && ico) ico.remove();
    });
  }

  // ------------------------------------------------------------ bolinhas
  let ballsBuilt = false;
  function ballInfo() {
    const s = QK.ballById(settings.ballId);
    $('ball-name').textContent = s.name;
    const power = QK.ballPower(s), trait = QK.ballTrait(s);
    let tags = power ? `<span class="tag lg">Lendária</span>` : `<span class="tag g${s.grade}">${QK.GRADE[s.grade]}</span>`;
    $('ball-tags').innerHTML = tags;
    $('ball-desc').textContent = s.desc;
    const pw = $('ball-power');
    pw.hidden = !power && !trait;
    pw.classList.toggle('trait', !power);
    if (power) pw.innerHTML = `${QK.icon('crown')}<span><b>Poder: ${power.name}.</b> ${power.desc}.</span>`;
    else if (trait) pw.innerHTML = `${QK.icon('info')}<span><b>Efeito visual.</b> ${trait}. Não muda a jogabilidade.</span>`;
    $('ball-card').classList.toggle('legend', !!power);
    ballsStage.setSkin(s);
  }
  function openBalls() {
    const grid = $('ball-grid');
    if (!ballsBuilt) {
      ballsBuilt = true;
      for (const s of QK.BALLS) {
        const b = document.createElement('button');
        const legend = !!QK.ballPower(s);
        b.className = 'ball-cell' + (legend ? ' legend' : '');
        b.dataset.id = s.id;
        b.setAttribute('aria-label', legend ? `${s.name} (lendária)` : s.name);
        b.innerHTML = `<canvas width="112" height="112"></canvas>${legend ? `<span class="crown">${QK.icon('crown')}</span>` : ''}`;
        QK.drawBallPreview(b.querySelector('canvas'), s);
        b.addEventListener('click', () => {
          tap('select');
          settings.ballId = s.id; saveSettings();
          if (game) game.opts.ballId = s.id;
          grid.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel'));
          b.classList.add('sel');
          ballInfo();
        });
        grid.appendChild(b);
      }
    }
    grid.querySelectorAll('.ball-cell').forEach((b) => b.classList.toggle('sel', +b.dataset.id === settings.ballId));
    ballInfo();
  }

  // ------------------------------------------------------------ guia
  function previewSpec(key) {
    const m = {
      LockKey: { type: 'Lock' }, Big: { type: 'Big', extra: { big: true } },
      Shield: { type: 'Shield', extra: { sides: [false, false, true, false] } },
      Shield2: { type: 'Shield', extra: { sides: [true, false, true, false] } },
      Shield3: { type: 'Shield', extra: { sides: [true, true, true, false] } },
      Bubble: { type: 'Bubble', extra: { bubble: true } }, Ice: { type: 'Ice', extra: { ice: 2 } },
      Transparent: { type: 'Transparent', extra: { invisible: false } }, Prison: { type: 'Prison', extra: { locked: 0 } },
      Rotation: { type: 'Rotation', extra: { tri: 1 } },
    };
    const sp = QK.SPECIAL.find((s) => s.key === key);
    return Object.assign({ type: key, hp: Math.round(QK.lineHp(40) * (sp ? sp.hp : 1)) }, m[key] || {});
  }
  function openGuide() {
    const list = $('guide-list');
    list.innerHTML = '';
    const section = (t) => list.insertAdjacentHTML('beforeend', `<h3>${t}</h3>`);
    const item = (spec, t, d, lv, icon) => {
      const el = document.createElement('div');
      el.className = 'g-item';
      el.innerHTML = `${icon ? `<span class="gico">${QK.icon(icon)}</span>` : '<canvas width="92" height="92"></canvas>'}<div><div class="t">${t}</div><div class="d">${d}</div></div>${lv ? `<span class="lv">linha ${lv}+</span>` : ''}`;
      list.appendChild(el);
      if (spec) QK.drawElementPreview(el.querySelector('canvas'), spec);
    };
    section('O básico');
    item(null, 'Mire e solte', 'Arraste para mirar e solte para disparar todas as bolas. Onde a primeira cair é o próximo ponto de disparo.', null, 'aim');
    item({ type: 'normal', hp: 12 }, 'Blocos', 'Cada batida tira 1 de HP. Se um bloco chegar ao chão, a partida acaba.');
    item({ type: 'normal', hp: 9, extra: { tri: 0 } }, 'Triângulos', 'Rebatem a bola em diagonal.');
    section('No campo');
    item({ kind: 'item', type: 'plus' }, '+1 bola', 'Passe por ela para ganhar mais uma bola.');
    item({ kind: 'item', type: 'vlaser' }, 'Raio vertical', 'A cada passagem, acerta a coluna inteira.');
    item({ kind: 'item', type: 'hlaser' }, 'Raio horizontal', 'A cada passagem, acerta a linha inteira.');
    item({ kind: 'item', type: 'spread' }, 'Desviador', 'Manda a bola para uma direção aleatória.');
    item({ kind: 'item', type: 'coin' }, 'Moeda', `+${V.coinValue} moedas para continuar partidas.`);
    section('Blocos especiais');
    for (const s of [...QK.SPECIAL].sort((a, b) => a.cond - b.cond)) item(previewSpec(s.key), s.name, QK.SPECIAL_DESC[s.key], s.cond);
    section('Reforços');
    for (const b of QK.BOOSTERS) item(null, b.name, b.desc, null, b.icon === 'balls' ? 'ballsplus' : b.icon);
    section(`Ferramentas (linha ${V.toolsUnlockLine}+)`);
    for (const a of QK.ACTIONS) item(null, a.name, a.desc, null, a.icon);
    openPop('pop-guide');
  }

  // ------------------------------------------------------------ carregamento
  const loader = $('loader');
  let tipTimer = 0;
  function showTip() {
    const p = $('loader-tip');
    p.classList.add('swap');
    setTimeout(() => { p.textContent = pick(QK.TIPS); p.classList.remove('swap'); }, 300);
  }
  function setProgress(k) { $('loader-fill').style.width = Math.round(Math.min(1, k) * 100) + '%'; }
  function hideLoader() {
    clearInterval(tipTimer);
    loader.classList.add('out');
    setTimeout(() => { loader.hidden = true; loader.classList.remove('out'); }, 450);
  }
  // mode 'boot' = abertura (logo + bolinhas); 'match' = antes da partida (barra + dica no rodapé)
  function openLoader(mode, status) {
    loader.hidden = false;
    loader.classList.toggle('boot', mode === 'boot');
    loader.classList.toggle('match', mode === 'match');
    $('loader-status').textContent = status || 'Carregando…';
    setProgress(0);
    clearInterval(tipTimer);
    if (mode === 'match') { $('loader-tip').textContent = pick(QK.TIPS); tipTimer = setInterval(showTip, 3600); }
  }

  // abertura do app: tarefas reais (fontes, miniaturas) e segue sozinha para o início
  function boot() {
    openLoader('boot');
    const started = performance.now(), MIN = 1700;
    const tasks = [
      () => (document.fonts && document.fonts.ready ? document.fonts.ready : null),
      () => openBalls(),
      () => openThemes(),
      () => { for (const b of QK.BALLS.slice(0, 20)) QK.drawBallPreview(document.createElement('canvas'), b); },
    ];
    let done = 0;
    const next = () => {
      if (done < tasks.length) {
        Promise.resolve(tasks[done]()).catch(() => {}).then(() => {
          done++;
          requestAnimationFrame(next);
        });
        return;
      }
      // tempo mínimo para a animação de abertura ser vista, depois entra direto
      setTimeout(hideLoader, Math.max(0, MIN - (performance.now() - started)));
    };
    next();
  }

  // carregamento curto antes de uma partida (toque pula)
  function loadThen(fn) {
    openLoader('match', 'Preparando o campo…');
    let finished = false;
    const finish = () => { if (finished) return; finished = true; fn(); hideLoader(); };
    const t0 = performance.now(), DUR = 1100;
    const tick = () => {
      if (finished) return;
      const k = Math.min(1, (performance.now() - t0) / DUR);
      setProgress(k);
      if (k < 1) requestAnimationFrame(tick); else finish();
    };
    tick();
    setTimeout(() => loader.addEventListener('pointerup', finish, { once: true }), 150);
  }

  // ------------------------------------------------------------ desempenho
  // Se a média de uma janela de ~2 s ficar abaixo de ~48 FPS, baixa a resolução interna meio degrau.
  let perfN = 0, perfSum = 0;
  function watchPerf(dt) {
    perfN++; perfSum += dt;
    if (perfN < 120) return;
    const avg = perfSum / perfN;
    perfN = 0; perfSum = 0;
    if (avg > 1 / 48) renderer.lowerQuality();
  }

  // ------------------------------------------------------------ loop
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (!loader.hidden && loader.classList.contains('match')) loaderScene.draw(dt);
    if (view === 'game' && game) {
      if (!paused()) game.update(dt);
      const shooting = game.state === 'shoot';
      $('btn-recall').hidden = !(shooting && game.shootTime > 1);
      $('btn-speed').hidden = !(shooting && game.shootTime > V.fastForwardDelay && game.timeScale < V.fastForward);
      $('speed-x').textContent = game.timeScale === 1 ? '2x' : `${V.fastForward}x`;
      renderer.draw(dt);
      watchPerf(dt);
    } else {
      renderer.drawIdle(dt);
      if (view === 'home') homeStage.draw(dt);
      if (view === 'balls') ballsStage.draw(dt);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // a música só pode começar depois do primeiro toque
  window.addEventListener('pointerdown', () => QK.sfx.unlock(), { once: true });
  // salva ao sair da aba
  window.addEventListener('pagehide', () => { if (game && game.state === 'aim') store.set('save', game.serialize()); });

  setView('home');
  boot();
})();
