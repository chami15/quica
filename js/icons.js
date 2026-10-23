// Ícones SVG da interface (traço arredondado, herdam a cor do botão via currentColor).
(function (root) {
  const QK = root.QK;
  const P = {
    home: '<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M6 9.8V19a1.2 1.2 0 0 0 1.2 1.2H10v-5.4h4v5.4h2.8A1.2 1.2 0 0 0 18 19V9.8"/>',
    balls: '<circle cx="8" cy="15.5" r="4.2"/><circle cx="16.6" cy="15.8" r="3.2"/><circle cx="13.2" cy="7.2" r="3.4" class="f"/>',
    modes: '<rect x="3.5" y="7" width="17" height="11" rx="5.5"/><path d="M8 10.6v3.8M6.1 12.5h3.8"/><circle cx="15.6" cy="11.3" r="1" class="f"/><circle cx="17.4" cy="13.8" r="1" class="f"/>',
    gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.85 1.85M7.35 16.65 5.5 18.5M18.5 18.5l-1.85-1.85M7.35 7.35 5.5 5.5"/><circle cx="12" cy="12" r="6.6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.4a2.7 2.7 0 1 1 3.7 2.5c-.7.3-1.1.9-1.1 1.6v.6"/><circle cx="12" cy="17" r=".9" class="f"/>',
    pause: '<rect x="6.5" y="5" width="3.8" height="14" rx="1.4" class="f"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.4" class="f"/>',
    play: '<path d="M8 5.3v13.4a1 1 0 0 0 1.5.86l10.6-6.7a1 1 0 0 0 0-1.72L9.5 4.44A1 1 0 0 0 8 5.3Z" class="f"/>',
    restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.2 4.5v4.3h4.3"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trophy: '<path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0v-5Z"/><path d="M7.5 6.5H4.8a2.7 2.7 0 0 0 2.9 4.1M16.5 6.5h2.7a2.7 2.7 0 0 1-2.9 4.1M12 14v3.5M8.5 20h7M9.5 17.5h5"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.4"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    sound: '<path d="M4.5 9.5h3.2L12 5.5v13l-4.3-4H4.5Z" class="f"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/>',
    music: '<path d="M9 17.5V6.2l10-2v11"/><circle cx="6.6" cy="17.6" r="2.6" class="f"/><circle cx="16.6" cy="15.3" r="2.6" class="f"/>',
    vibrate: '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7M2 10.5v3M22 10.5v3"/>',
    aim: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.2" class="f"/><path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5"/>',
    blocks: '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" class="f"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" class="f"/><rect x="13" y="13" width="7.5" height="7.5" rx="2"/>',
    infinity: '<path d="M12 12c-2-2.8-3.6-4-5.4-4a4 4 0 0 0 0 8c1.8 0 3.4-1.2 5.4-4Zm0 0c2 2.8 3.6 4 5.4 4a4 4 0 0 0 0-8c-1.8 0-3.4 1.2-5.4 4Z"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 12.2a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l1-12.2"/>',
    shake: '<rect x="7" y="5" width="10" height="14" rx="2.5"/><path d="M3.5 9l1.5 1.5L3.5 12l1.5 1.5L3.5 15M20.5 9 19 10.5l1.5 1.5-1.5 1.5 1.5 1.5"/>',
    face: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9.3" cy="10.5" r="1.2" class="f"/><circle cx="14.7" cy="10.5" r="1.2" class="f"/><path d="M9 15c1.8 1.4 4.2 1.4 6 0"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.6 1.7-1.6h2.2a3.8 3.8 0 0 0 3.8-3.8C20.5 6.6 16.7 3.5 12 3.5Z"/><circle cx="7.8" cy="11" r="1.2" class="f"/><circle cx="10" cy="7.4" r="1.2" class="f"/><circle cx="14.4" cy="7.4" r="1.2" class="f"/>',
    blocksbroken: '<rect x="4" y="4" width="7" height="7" rx="1.8"/><path d="M14.5 5.5l2 2 3-3M14 14h6v6h-6zM4 14l7 7M11 14l-7 7"/>',
    combo: '<path d="M13 2.5 5.5 13.5H11L10 21.5l8-11.5h-5.5Z" class="f"/>',
    crown: '<path d="M4 17.5 3 7.5l5 4 4-6.5 4 6.5 5-4-1 10Z" class="f"/><path d="M4.5 20.5h15"/>',
    info: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="1.1" class="f"/>',
    star: '<path d="m12 3.6 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7Z" class="f"/>',
    pad: '<path d="M3.5 15.5h17"/><path d="M6 15.5c1-4 3.2-6 6-6s5 2 6 6"/><path d="M6.5 19.5v-4M17.5 19.5v-4"/>',
    drill: '<path d="M12 21 8 13.5V4.5h8v9Z"/><path d="M8 8h8M8 11.5h8"/>',
    beam: '<path d="M2.5 12h19" stroke-width="3.6"/><path d="M6 7.5l2 2M18 7.5l-2 2M6 16.5l2-2M18 16.5l-2-2"/>',
    rocket: '<path d="M12 3c3.2 2.4 4.6 5.8 4 10.5l-2 2.5h-4l-2-2.5C7.4 8.8 8.8 5.4 12 3Z"/><circle cx="12" cy="9.5" r="1.6" class="f"/><path d="M8.2 13 5.5 16v2.5l3.6-1.6M15.8 13l2.7 3v2.5l-3.6-1.6M10.5 19l1.5 2.5 1.5-2.5"/>',
    hole: '<circle cx="12" cy="12" r="3" class="f"/><path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5M19.5 12a7.5 7.5 0 0 1-7.5 7.5M12 19.5A7.5 7.5 0 0 1 4.5 12M4.5 12A7.5 7.5 0 0 1 12 4.5" stroke-dasharray="6 4"/>',
    ballsplus: '<circle cx="9" cy="13" r="5.5"/><path d="M18 4.5v6M15 7.5h6"/>',
    fast: '<path d="M3.5 6.5v11l7.5-5.5ZM12 6.5v11l7.5-5.5Z" class="f"/>',
    recall: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="m12 7.6 1.3 2.8 3 .4-2.2 2.1.6 3L12 14.4l-2.7 1.5.6-3-2.2-2.1 3-.4Z" class="f"/>',
    sling: '<path d="M7 20v-6.5a5 5 0 0 1 10 0V20"/><path d="M7 13.5 12 9l5 4.5"/><circle cx="12" cy="6" r="2.2" class="f"/>',
    finger: '<path d="M9.5 11V5.5a1.8 1.8 0 0 1 3.6 0V10l4.3.9a2 2 0 0 1 1.6 2.2l-.6 4.6A3 3 0 0 1 15.4 20H11a3 3 0 0 1-2.4-1.2l-3-4a1.6 1.6 0 0 1 2.5-2Z"/>',
  };
  // centro geométrico medido de cada ícone (ver fitIcons); a caixa 24x24 é recentralizada nele
  const VB = {};
  // ajuste óptico: formas assimétricas parecem descentralizadas mesmo com a caixa centrada
  const NUDGE = { play: [-0.9, 0], fast: [-0.3, 0], recall: [0, 0] };
  QK.icon = (name, cls) =>
    `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="${VB[name] || '0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  QK.fitIcons = () => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
    svg.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
    document.body.appendChild(svg);
    for (const name of Object.keys(P)) {
      const g = document.createElementNS(ns, 'g');
      g.innerHTML = P[name];
      svg.appendChild(g);
      try {
        const b = g.getBBox();
        const n = NUDGE[name] || [0, 0];
        const cx = b.x + b.width / 2 + n[0], cy = b.y + b.height / 2 + n[1];
        VB[name] = `${(cx - 12).toFixed(2)} ${(cy - 12).toFixed(2)} 24 24`;
      } catch (e) { /* sem layout: mantém 0 0 24 24 */ }
      svg.removeChild(g);
    }
    svg.remove();
  };
  // preenche elementos com data-icon="nome"
  QK.hydrateIcons = (rootEl) => {
    (rootEl || document).querySelectorAll('[data-icon]').forEach((el) => {
      if (!el.querySelector('svg.ico')) el.insertAdjacentHTML('afterbegin', QK.icon(el.dataset.icon));
    });
  };
})(window);
