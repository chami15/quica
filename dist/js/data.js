// Dados do jogo: geometria, constantes de balanceamento, blocos especiais, itens e bolinhas.
(function (root) {
  const QK = root.QK = root.QK || {};

  QK.NAME = 'Quica';

  // ---- Geometria do campo (7 colunas; x = col*16.2 - 48.6, y = 64.8 - row*16.2)
  QK.CELL = 16.2;
  QK.COLS = 7;
  QK.ROWS = 11;                 // linha 0 = folga p/ bloco gigante; nova linha nasce na 1; chegar na última = fim
  QK.LEFT = -QK.CELL * QK.COLS / 2;   // -56.7
  QK.RIGHT = QK.CELL * QK.COLS / 2;   //  56.7
  QK.TOP = 64.8 + QK.CELL / 2;        //  72.9
  QK.GROUND = QK.TOP - QK.ROWS * QK.CELL;
  QK.BLOCK_HALF = 7.3;          // meio-lado visual/colisor do bloco (pequeno vão entre blocos)
  QK.BALL_R = 1.65;
  QK.ITEM_R = 4.6;

  // ---- Balanceamento
  QK.V = {
    bonusBalls: 5,               // reforço "Bola +5"
    rocketDivisor: 3,            // dano do foguete = bolas / 3
    triangleRate: 0.25,
    launchIntervalMs: 60,
    minAngleDeg: 19,
    ballSpeed: 200,              // unidades do campo por segundo
    fastForward: 5,
    fastForwardDelay: 5,         // s até aparecer o botão de acelerar
    recallSpeed: 5,
    maxSpecialsPerRow: 4,
    specialRate: 0.40,
    helperRate: 0.30,
    coinRate: 0.03,
    coinValue: 5,
    densityPerLine: 0.04,        // chance base de blocos cresce 4% por linha
    densityFalloff: 0.45,        // cada bloco extra na linha é 45% menos provável
    densityCap: 0.80,
    densityReset: 5.00,
    continueCost: [100, 150, 200],
    toolsUnlockLine: 30,
    longAimBounces: 3,
  };

  // HP dos blocos de uma linha: linha + linha/100 + linha/1000
  QK.lineHp = (line) => line + Math.floor(line / 100) + Math.floor(line / 1000);

  // ---- Blocos especiais (cond = linha mínima, per = peso no sorteio, hp = multiplicador)
  QK.SPECIAL = [
    { id: 1, key: 'Double', name: 'Bloco 2x', cond: 37, per: 90, hp: 2 },
    { id: 2, key: 'Split', name: 'Bloco divisor', cond: 23, per: 120, hp: 1 },
    { id: 3, key: 'Shield', name: 'Bloco blindado', cond: 104, per: 150, hp: 0.5 },
    { id: 4, key: 'Thorn', name: 'Bloco espinhento', cond: 77, per: 180, hp: 0.6 },
    { id: 5, key: 'Bubble', name: 'Bloco bolha', cond: 143, per: 180, hp: 0.7 },
    { id: 6, key: 'Transparent', name: 'Bloco fantasma', cond: 121, per: 150, hp: 1 },
    { id: 7, key: 'LockKey', name: 'Cadeado e chave', cond: 95, per: 210, hp: 1 },
    { id: 8, key: 'Big', name: 'Bloco gigante', cond: 39, per: 120, hp: 3 },
    { id: 9, key: 'Share', name: 'Blocos irmãos', cond: 58, per: 300, hp: 1 },
    { id: 10, key: 'Rush', name: 'Bloco apressado', cond: 180, per: 150, hp: 0.8 },
    { id: 11, key: 'Shield2', name: 'Bloco blindado 2', cond: 335, per: 210, hp: 0.5 },
    { id: 12, key: 'Ice', name: 'Bloco congelado', cond: 220, per: 150, hp: 1 },
    { id: 13, key: 'Prison', name: 'Bloco jaula', cond: 241, per: 120, hp: 0.4 },
    { id: 14, key: 'Drain', name: 'Bloco comilão', cond: 270, per: 180, hp: 0.6 },
    { id: 15, key: 'Shield3', name: 'Bloco blindado 3', cond: 1131, per: 330, hp: 0.5 },
    { id: 16, key: 'Recovery', name: 'Bloco regenerador', cond: 819, per: 300, hp: 0.4 },
    { id: 17, key: 'Heal', name: 'Bloco curandeiro', cond: 495, per: 165, hp: 1 },
    { id: 18, key: 'Spread', name: 'Bloco maluco', cond: 600, per: 240, hp: 1 },
    { id: 19, key: 'Rotation', name: 'Bloco giratório', cond: 319, per: 210, hp: 1.2 },
    { id: 20, key: 'Move', name: 'Bloco saltitante', cond: 390, per: 150, hp: 1 },
  ];
  QK.SPECIAL_DESC = {
    Double: 'Tem o dobro de HP.',
    Split: 'Ao ser destruído, vira 2 blocos menores.',
    Big: 'Bloco gigante que ocupa 4 espaços.',
    Share: 'Todos os irmãos dividem o mesmo HP.',
    LockKey: 'Quebre a chave para destrancar o cadeado.',
    Thorn: 'A bola que bate nos espinhos some até o fim da rodada.',
    Shield: 'O lado de baixo não sofre dano.',
    Shield2: 'Dois lados não sofrem dano.',
    Shield3: 'Só um lado pode ser atingido.',
    Transparent: 'Some em rodadas alternadas, e as bolas atravessam.',
    Bubble: 'A bolha absorve o primeiro golpe.',
    Rush: 'Desce uma casa a mais se houver espaço embaixo.',
    Ice: 'Não sofre dano até o gelo derreter.',
    Prison: 'Prende a bola que o atinge até ser destruído.',
    Drain: 'Depois da rodada, come um bloco vizinho.',
    Recovery: 'Recupera todo o HP depois de cada rodada.',
    Heal: 'Ao quebrar, cura outro bloco.',
    Spread: 'Rebate a bola em um ângulo aleatório.',
    Rotation: 'Triângulo que gira quando atingido.',
    Move: 'Pula para outro lugar quando atingido.',
  };

  // ---- Itens de ajuda que aparecem no campo (peso no sorteio)
  QK.HELP = [
    { key: 'vlaser', name: 'Raio vertical', per: 2000 },
    { key: 'hlaser', name: 'Raio horizontal', per: 2000 },
    { key: 'spread', name: 'Desviador', per: 4000 },
  ];

  // ---- Reforços (antes da partida) e ferramentas (durante a partida)
  QK.BOOSTERS = [
    { key: 'addball', name: 'Bola +5', icon: 'balls', desc: 'Começa com 5 bolas a mais.' },
    { key: 'rocket', name: 'Foguete', icon: 'rocket', desc: 'No fim de cada rodada, acerta o bloco mais fraco.' },
    { key: 'blackhole', name: 'Buraco negro', icon: 'hole', desc: 'Engole um bloco aleatório a cada 3 rodadas.' },
  ];
  QK.ACTIONS = [
    { key: 'pad', name: 'Trampolim', icon: 'pad', desc: 'Coloca um trampolim de 2 casas no chão nesta rodada.' },
    { key: 'drill', name: 'Broca', icon: 'drill', desc: 'Destrói a coluna com mais blocos.' },
    { key: 'hline', name: 'Raio', icon: 'beam', desc: 'Destrói a linha de blocos mais baixa.' },
    { key: 'super', name: 'Superbola', icon: 'star', desc: 'Neste disparo, cada bola destrói o que tocar.' },
  ];

  // ---- Bolinhas: 83, todas liberadas.
  // ability: speed | ninja | monster | laser | all | coin
  // size: multiplicador do raio. shape: circle | square | triangle
  // look: [cor principal, cor secundária, padrão, variação]
  const B = (id, name, grade, look, extra) => Object.assign({ id, name, grade, look, size: 1, shape: 'circle', ability: null }, extra || {});
  QK.BALLS = [
    B(1, 'Clássica', 1, ['#ffffff', '#dfe6ff', 'solid']),
    B(2, 'Sinuca', 1, ['#26262e', '#ffffff', 'eight']),
    B(3, 'Basquete', 1, ['#f08a24', '#5a2a00', 'basket']),
    B(4, 'Futebol', 1, ['#ffffff', '#222230', 'soccer']),
    B(5, 'Beisebol', 1, ['#fafafa', '#e23b3b', 'base']),
    B(6, 'Hambúrguer', 2, ['#e0a046', '#5b8f2a', 'burger']),
    B(7, 'Bolha azul', 1, ['#9fe3ff', '#ffffff', 'bubble']),
    B(8, 'Bolha rosa', 1, ['#ffb3e6', '#ffffff', 'bubble']),
    B(9, 'Medalha', 1, ['#ffd23f', '#c48a00', 'ring']),
    B(10, 'Relógio', 1, ['#ffffff', '#333344', 'clock']),
    B(11, 'Planeta azul', 1, ['#2f80ed', '#3ecf6a', 'earth']),
    B(12, 'Lua', 1, ['#d8d8d0', '#9a9a90', 'dots']),
    B(13, 'Planeta vermelho', 1, ['#d9532c', '#8f2c12', 'dots']),
    B(14, 'Sol', 2, ['#ffcc33', '#ff7a00', 'glow'], { trail: '#ffb000' }),
    B(15, 'Estrela cadente', 1, ['#ff9a1f', '#fff1c2', 'star']),
    B(16, 'Cometa', 2, ['#7cf7ff', '#0077ff', 'glow'], { trail: '#4fd8ff' }),
    B(17, 'Olho de fogo', 2, ['#ffffff', '#e0242f', 'eye'], { trail: '#ff4040' }),
    B(18, 'Olho azul', 1, ['#ffffff', '#2f80ed', 'eye']),
    B(19, 'Arco-íris', 1, ['#ff4d4d', '#4d79ff', 'rainbow']),
    B(20, 'Laranja', 1, ['#ff9a1f', '#7bc043', 'fruit']),
    B(21, 'Lente', 1, ['#2b2f3a', '#5ab0ff', 'ring']),
    B(22, 'Maçã', 1, ['#e8323c', '#6bbf3a', 'fruit']),
    B(23, 'Meio a meio', 1, ['#ffffff', '#16161e', 'half']),
    B(24, 'Ouro', 2, ['#ffd700', '#fff3a0', 'glow'], { trail: '#ffd700' }),
    B(25, 'Radar', 1, ['#1d7a3a', '#7dff9a', 'ring']),
    B(26, 'Estrela azul', 1, ['#4d8dff', '#ffffff', 'star']),
    B(27, 'Neon', 2, ['#ff4fd8', '#4fffe1', 'rainbow'], { trail: '#ff4fd8' }),
    B(28, 'Alvo', 1, ['#ffffff', '#e8323c', 'target']),
    B(29, 'Panda', 1, ['#ffffff', '#16161e', 'panda']),
    B(30, 'Leão', 1, ['#ffcf5a', '#8a5a00', 'face', 'lion']),
    B(31, 'Ratinho', 1, ['#b4b4c0', '#ff9fb0', 'face', 'mouse']),
    B(32, 'Jade', 2, ['#3ecf6a', '#ffcc00', 'glow'], { trail: '#3ecf6a' }),
    B(33, 'Flor noturna', 1, ['#24243a', '#ff4d8d', 'flower']),
    B(34, 'Flor', 2, ['#ff8fc8', '#ffe066', 'flower'], { trail: '#ff8fc8' }),
    B(35, 'Mini', 3, ['#ffffff', '#dfe6ff', 'solid'], { size: 0.6 }),
    B(36, 'Quadrada', 3, ['#ffffff', '#dfe6ff', 'solid'], { shape: 'square' }),
    B(37, 'Código', 1, ['#0b2a16', '#00ff66', 'ring']),
    B(38, 'Supernova', 2, ['#ff7a3d', '#ffe0b0', 'glow']),
    B(39, 'Foguetinho', 3, ['#ff3b3b', '#ffffff', 'stripe'], { ability: 'speed' }),
    B(40, 'Anel rosa', 1, ['#ff8fc8', '#ffffff', 'ring']),
    B(41, 'Pião', 1, ['#9b59ff', '#ffffff', 'stripe']),
    B(42, 'Melancia', 1, ['#2fa84f', '#ff4d5e', 'melon']),
    B(43, 'Confete', 1, ['#ffffff', '#ff3366', 'dots']),
    B(44, 'Shuriken', 3, ['#9aa3ad', '#333a40', 'star'], { ability: 'ninja' }),
    B(45, 'Monstrinho', 3, ['#7c5cff', '#ffffff', 'face', 'monster'], { ability: 'monster' }),
    B(46, 'Pizza', 1, ['#ffcf5a', '#e8323c', 'dots']),
    B(47, 'Grana', 1, ['#3ecf6a', '#1b5e20', 'ring']),
    B(48, 'Tesouro', 1, ['#c48a00', '#ffd700', 'ring']),
    B(49, 'Trovão', 3, ['#3b2a7a', '#ffe14d', 'bolt'], { ability: 'laser', trail: '#ffe14d' }),
    B(50, 'Caleidoscópio', 3, ['#ffffff', '#ff4d4d', 'rainbow'], { ability: 'all' }),
    B(51, 'Ursinho', 1, ['#c98a5a', '#5a2a00', 'face', 'bear']),
    B(52, 'Gato', 1, ['#ffb347', '#5a2a00', 'face', 'cat']),
    B(53, 'Triângulo', 3, ['#ffffff', '#dfe6ff', 'solid'], { shape: 'triangle' }),
    B(54, 'Sorriso', 1, ['#ffe066', '#222230', 'face']),
    B(55, 'Moedinha', 3, ['#ffd700', '#c48a00', 'coin'], { ability: 'coin' }),
    B(56, 'Micro', 3, ['#ffffff', '#dfe6ff', 'solid'], { size: 0.35 }),
    B(57, 'Caos', 1, ['#7b2ff7', '#ff2fd0', 'rainbow']),
    B(58, 'Engrenagem', 1, ['#9aa3ad', '#555c63', 'ring']),
    B(59, 'Kiwi', 1, ['#7bc043', '#5a3a1a', 'dots']),
    B(60, 'Floco de neve', 3, ['#ffffff', '#bfe9ff', 'glow'], { trail: '#ffffff', snow: true }),
    B(61, 'Inverno', 1, ['#ffffff', '#2f80ed', 'rainbow']),
    B(62, 'Farol', 3, ['#5a6b7d', '#ffcc00', 'glow'], { trail: '#ffcc00' }),
    B(63, 'Estrela', 2, ['#ffe066', '#ffffff', 'star'], { trail: '#ffe066' }),
    B(64, 'Doce', 2, ['#ff6fb5', '#ffffff', 'stripe'], { trail: '#ff6fb5' }),
    B(65, 'Dado', 1, ['#ffffff', '#16161e', 'dice']),
    B(66, 'Dado dourado', 1, ['#ffd23f', '#16161e', 'dice']),
    B(67, 'Raposa', 2, ['#ff8a3d', '#2a1a10', 'face', 'fox'], { trail: '#ffb347' }),
    B(68, 'Dado azul', 1, ['#4d8dff', '#ffffff', 'dice']),
    B(69, 'Natal vermelho', 1, ['#e8323c', '#ffffff', 'stripe']),
    B(70, 'Natal verde', 1, ['#2fa84f', '#ffd700', 'stripe']),
    B(71, 'Boia lima', 1, ['#b6ff3b', '#ffffff', 'ring']),
    B(72, 'Boia flamingo', 1, ['#ff8fc8', '#ffffff', 'ring']),
    B(73, 'Tênis', 1, ['#d7ff3b', '#ffffff', 'base']),
    B(74, 'Risada', 1, ['#ffd23f', '#222230', 'face', 'laugh']),
    B(75, 'Coração', 1, ['#ff4d6d', '#ffffff', 'heart']),
    B(76, 'Língua de fora', 1, ['#ffd23f', '#ff4d6d', 'face', 'tongue']),
    B(77, 'Óculos escuros', 1, ['#ffd23f', '#16161e', 'face', 'shades']),
    B(78, 'Fluxo', 1, ['#4fffe1', '#4d79ff', 'stripe']),
    B(79, 'Diamante', 1, ['#9fe3ff', '#4d79ff', 'star']),
    B(80, 'Galáxia', 1, ['#ff4fd8', '#7b2ff7', 'rainbow']),
    B(81, 'Zigue-zague', 1, ['#ffe066', '#ff7a00', 'stripe']),
    B(82, 'Brigadeiro', 1, ['#5a3a1a', '#ff6fb5', 'dots']),
    B(83, 'Geleca', 1, ['#7cf7a0', '#2fa84f', 'face', 'slime'], { trail: '#7cf7a0' }),
  ];
  // descrição única de cada bolinha
  const DESC = [
    'A original. Simples, honesta e sempre pronta para quicar.',
    'Saiu da mesa de sinuca e nunca mais quis voltar para a caçapa.',
    'Treinou arremessos de três pontos a vida toda.',
    'Driblou o campo inteiro e veio parar aqui.',
    'Costuras vermelhas e um histórico de home runs.',
    'Pão, queijo e alface. Quica com gosto.',
    'Leve como o ar, mas bate de verdade.',
    'Doce de olhar e surpreendentemente teimosa.',
    'Prêmio de quem nunca desistiu de uma rodada.',
    'Tique-taque. Cada segundo conta.',
    'Um planetinha inteiro, com oceanos e continentes.',
    'Cheia de crateras de tanto bater em bloco.',
    'Veio de longe, poeirenta e cor de ferrugem.',
    'Brilha tanto que deixa um rastro de luz.',
    'Faça um pedido antes de soltar.',
    'Atravessa o campo deixando uma cauda azul.',
    'Um olhar que queima. Literalmente.',
    'Vê cada bloco antes de acertá-lo.',
    'Sete cores girando sem parar.',
    'Cítrica, redonda e cheia de vitamina.',
    'Foca no alvo e nunca perde o ângulo.',
    'Caiu da árvore e decidiu quebrar blocos.',
    'Metade claro, metade escuro. Equilíbrio puro.',
    'Feita de ouro maciço, com um brilho que aparece de longe.',
    'Varre o campo procurando o próximo alvo.',
    'Uma estrela fria no céu da noite.',
    'Cores de festa que deixam rastro.',
    'Mira no centro, sempre.',
    'Preguiçosa, mas quando acerta, acerta.',
    'O rei da selva veio rugir no campo.',
    'Pequenininho e rápido nas curvas.',
    'Pedra preciosa verde com um brilho calmo.',
    'Floresce mesmo no escuro.',
    'Perfume de primavera e um rastro rosado.',
    'Pequena e difícil de ver, perfeita para passar entre os blocos.',
    'Quem disse que precisa ser redonda?',
    'Escrita em uns e zeros.',
    'Uma estrela gigante prestes a explodir.',
    'Movida a turbina. Ninguém chega antes dela.',
    'Uma boia que só pensa em pular.',
    'Gira, gira e não cai.',
    'Fresquinha, cheia de sementes e bem suculenta.',
    'Toda rodada é uma festa.',
    'Treinada nas artes antigas. Nunca segue a linha reta.',
    'Pequeno, roxo e com um apetite enorme por blocos.',
    'Uma fatia de muçarela que saiu rolando.',
    'Verde como dinheiro novo.',
    'Escondida no fundo do mar por séculos.',
    'Carrega uma tempestade dentro de si.',
    'Nunca se sabe qual bolinha vai sair.',
    'Fofo e abraçável, mas forte que só.',
    'Sete vidas e nenhuma paciência para blocos.',
    'Três pontas e muita atitude.',
    'Bom humor contagiante.',
    'Pequena e dourada. Adora um tesouro.',
    'Tão pequena que parece um grão.',
    'Ninguém sabe que cor vai aparecer a seguir.',
    'Cada volta move uma máquina invisível.',
    'Peluda por fora, verdinha por dentro.',
    'Traz o inverno consigo. Neva no campo enquanto ela joga.',
    'Listras de gelo e céu de inverno.',
    'Ilumina o caminho para as outras bolinhas.',
    'Caiu do céu numa noite clara.',
    'Listrada e doce como bala.',
    'Seis lados de pura sorte.',
    'O dado dos reis.',
    'Esperta, ágil e com uma cauda de fogo.',
    'Sorte em azul.',
    'Embrulhada para presente.',
    'Cheira a pinheiro e chocolate quente.',
    'Pronta para a piscina.',
    'Equilibra em uma perna só.',
    'Felpuda e cheia de saque.',
    'Não consegue parar de rir.',
    'Bate forte por amor ao jogo.',
    'Faz careta para os blocos.',
    'Descolada demais para se preocupar.',
    'Ondas de cor que nunca param.',
    'Lapidada com perfeição.',
    'Guarda uma galáxia inteira dentro.',
    'Vai e volta, sempre no ritmo.',
    'Coberta de granulado. Irresistível.',
    'Gosmenta, verde e muito feliz.',
  ];
  QK.BALLS.forEach((b, i) => { b.desc = DESC[i]; });
  QK.ABILITY_NAME = {
    speed: 'Turbo', ninja: 'Arremesso ninja', monster: 'Mordida dupla',
    laser: 'Descarga elétrica', all: 'Surpresa', coin: 'Toque de ouro',
  };
  QK.ABILITY_DESC = {
    speed: 'Voa 1,8x mais rápido',
    ninja: 'Ângulo levemente imprevisível',
    monster: '1 em 11 de chance de dano dobrado',
    laser: '1 em 20 de chance de soltar um raio',
    all: 'Cada disparo usa uma bolinha surpresa',
    coin: 'Moedas em dobro',
  };
  QK.GRADE = ['', 'Comum', 'Rara', 'Especial'];

  // ---- Temas visuais do campo: fundo, partículas flutuantes e rampa de cor dos blocos (HP baixo -> alto)
  QK.THEMES = [
    { id: 'noite', ui: ['#2d2575', '#3b3196', '#15113a'], name: 'Noite', desc: 'O clássico do Quica: céu roxo e blocos de bala.',
      bg: ['#1d1a4a', '#141537', '#0d0e26'], float: ['rgba(140,110,255,0.07)', 'rgba(80,200,255,0.06)'], dots: 'rgba(170,160,255,0.10)', ground: '150,140,255',
      ramp: ['#3fe0b0', '#38c3f2', '#5a7dfa', '#8a5cf6', '#dd4fd0', '#ff5c7c', '#ff8a3d'] },
    { id: 'oceano', ui: ['#174a73', '#1f5f91', '#0a2338'], name: 'Oceano', desc: 'Águas profundas e blocos de coral.',
      bg: ['#0f3a5a', '#0b2742', '#06172a'], float: ['rgba(90,220,255,0.07)', 'rgba(120,255,220,0.05)'], dots: 'rgba(140,220,255,0.10)', ground: '110,220,255',
      ramp: ['#5ef2d6', '#3ec9e8', '#2f8fe0', '#3a5fd9', '#6a4fd6', '#b04fd0', '#ff6f91'] },
    { id: 'por-do-sol', ui: ['#55235f', '#6c2e79', '#250e2c'], name: 'Pôr do sol', desc: 'Fim de tarde quente, do dourado ao violeta.',
      bg: ['#4a1f4f', '#2e1438', '#1a0c24'], float: ['rgba(255,170,100,0.07)', 'rgba(255,110,160,0.06)'], dots: 'rgba(255,190,170,0.10)', ground: '255,170,120',
      ramp: ['#ffc34d', '#ffa04d', '#ff7a55', '#f2557a', '#d4459a', '#a23fb5', '#6c3bd1'] },
    { id: 'floresta', ui: ['#1f4d3a', '#2a654c', '#0b231a'], name: 'Floresta', desc: 'Musgo, folhas e um pouco de mistério.',
      bg: ['#17402f', '#0f2c21', '#081a13'], float: ['rgba(150,255,150,0.06)', 'rgba(255,240,150,0.05)'], dots: 'rgba(170,255,190,0.10)', ground: '150,240,170',
      ramp: ['#a8e85a', '#6fd16a', '#36b981', '#2a9d9a', '#2f7fa8', '#4b5fb5', '#7a4cb8'] },
    { id: 'doce', ui: ['#4a2a70', '#5e378c', '#1f1236'], name: 'Doceria', desc: 'Cores de confeitaria para adoçar a partida.',
      bg: ['#3d2357', '#2a1840', '#1c1030'], float: ['rgba(255,150,220,0.07)', 'rgba(150,220,255,0.06)'], dots: 'rgba(255,190,240,0.10)', ground: '255,160,220',
      ramp: ['#4fd0e8', '#6f9bff', '#9b7bff', '#cf63ec', '#ff5fa8', '#ff7466', '#ffa13d'] },
  ];
  QK.themeById = (id) => QK.THEMES.find((t) => t.id === id) || QK.THEMES[0];
  QK.theme = QK.THEMES[0];

  // ---- Elogios por quantidade de blocos quebrados numa jogada (valores iniciais, ver docs/DESIGN.md)
  QK.PRAISE = [
    { min: 18, text: 'Lendário!', color: '#ffd23f' },
    { min: 12, text: 'Espetacular!', color: '#ff8a3d' },
    { min: 8, text: 'Incrível!', color: '#ff5fa8' },
    { min: 5, text: 'Ótimo!', color: '#38c3f2' },
    { min: 3, text: 'Boa!', color: '#6dffb0' },
  ];
  QK.MILESTONE_EVERY = 50;

  QK.TIPS = [
    'Mire nas paredes: o ricochete alcança blocos escondidos.',
    'Pegar a +1 cedo vale mais que quebrar um bloco.',
    'Arraste o dedo para baixo do chão para cancelar a mira.',
    'A primeira bola a cair define o próximo ponto de disparo.',
    'Bolas presas entre o teto e os blocos acertam várias vezes.',
    'Acelere com o botão de avanço quando a jogada demorar.',
    'Os raios acertam a linha ou coluna inteira a cada passagem.',
    'Guarde as ferramentas para quando o campo apertar.',
    'Blocos assustados estão perto do chão: cuide deles primeiro.',
    'Troque de tema na aba de coleção para mudar o clima.',
  ];
  QK.OVER_TITLES = ['Ops! Os blocos chegaram', 'Eles venceram desta vez', 'Quase!', 'Fim da linha'];

  // poder real na partida (bolinhas lendárias): habilidade ou tamanho menor
  QK.ballPower = (b) => {
    if (b.ability) return { name: QK.ABILITY_NAME[b.ability], desc: QK.ABILITY_DESC[b.ability] };
    if (b.size < 1) return { name: 'Miniatura', desc: `${Math.round((1 - b.size) * 100)}% menor: passa por frestas onde as outras batem` };
    return null;
  };
  // diferença só visual das especiais sem poder
  QK.ballTrait = (b) => {
    if (QK.ballPower(b) || b.grade < 3) return null;
    if (b.snow) return 'Faz nevar no campo durante a partida';
    if (b.shape !== 'circle') return 'Formato só visual: quica igual às redondas';
    if (b.trail) return 'Deixa um rastro de luz por onde passa';
    return null;
  };
  QK.ballById = (id) => QK.BALLS.find((b) => b.id === id) || QK.BALLS[0];
})(typeof window !== 'undefined' ? window : globalThis);
