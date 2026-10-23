# Quica

Jogo de quebrar blocos: mire, solte todas as bolinhas, quebre os blocos antes que cheguem ao chão
e pegue as bolinhas **+1** para ficar mais forte a cada linha.

**Grátis e sem anúncios:** as 83 bolinhas, a mira longa, os reforços e as ferramentas vêm todos liberados.

## Como jogar

Abra o `index.html` com dois cliques. Não precisa instalar nada e funciona offline.

| Ação | Como |
|---|---|
| Mirar | toque e arraste; solte para disparar |
| Cancelar mira | arraste para baixo do chão e solte |
| Recolher bolas | botão de seta para baixo, ou `Espaço` |
| Acelerar | botão de avanço rápido (aparece após 5 s), ou `F` |
| Pausar | botão de pausa, ou `Esc` |

A partida é salva automaticamente a cada rodada. Na tela inicial, o botão vira **Continuar** quando
existe uma partida salva. O botão redondo ao lado dele começa uma partida nova.

## Estrutura

```
index.html            telas: início, bolinhas, HUD e pop-ups
style.css             visual da interface
manifest.webmanifest  dados para instalar como app (PWA)
icons/                ícone do app (SVG + PNG 192/512)
fonts/                Fredoka (texto) e Lilita One (títulos e números), licença OFL, embutidas em fonts.css
js/data.js            constantes, blocos especiais, itens e bolinhas
js/game.js            regras + física (sem DOM; roda também no Node)
js/render.js          desenho do campo, blocos com carinha, bolinhas e efeitos
js/icons.js           ícones SVG da interface
js/audio.js           efeitos, música gerada por síntese e vibração
js/main.js            abas, pop-ups, HUD, entrada e salvamento
tests/                testes automáticos
docs/DESIGN.md        notas de design: feedback, comemorações, números a validar
```

O nome aparece em `index.html` (`<title>` e logo), `manifest.webmanifest` e `js/data.js` (`QK.NAME`).

## Testes

```
node tests/sim.test.js       # 12 partidas simuladas: física, grade, save/load
node tests/browser.test.js   # abre no Chrome headless, navega por todas as telas e tira screenshots
```

## Publicar na Play Store

O jogo é só HTML, CSS e JS. O caminho mais simples é empacotar com o
[Capacitor](https://capacitorjs.com/):

1. `npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android`
2. `npx cap init Quica com.seunome.quica --web-dir .`
   Use uma pasta `www/` só com os arquivos do jogo, sem `tests/`.
3. `npx cap add android && npx cap open android`
4. No Android Studio:
   - adicione `<uses-permission android:name="android.permission.VIBRATE"/>` no `AndroidManifest.xml`;
   - trave a orientação em retrato;
   - gere o `.aab` assinado.

Outra opção é hospedar com HTTPS (GitHub Pages, Netlify) e gerar um app TWA com o
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

## Próximos passos
- Modos de jogo (a aba já existe na barra inferior, marcada como "em breve")
- Desafio diário com semente igual para todos
- Ranking online
- Botão "voltar" do Android fechando pop-ups e pausando
