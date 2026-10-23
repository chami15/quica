# Quica: notas de design (passe de acabamento)

Avaliação feita com o filtro de 5 componentes: Clareza, Motivação, Resposta, Satisfação e Encaixe.
A mecânica não mudou. Este passe trata só de feedback, personalidade e personalização.

## Laço principal

| Item | Descrição |
|---|---|
| Verbos | mirar → soltar → assistir → coletar |
| Cadência de recompensa | Toda rodada: +1 bola e uma linha nova. Jogadas boas ganham elogio. A cada 50 linhas, um marco. Recorde dá confete |
| Arco da sessão | 30 s: primeiras quebras. 2 min: linha 10-20. 10 min: blocos especiais e ferramentas (linha 30+) |

## Avaliação por componente

| Componente | Antes | O que entrou |
|---|---|---|
| **Resposta** | Bom: a mira responde ao toque na hora | Aviso "Solte para cancelar" quando o dedo passa do chão. Antes, o cancelamento existia, mas era invisível |
| **Clareza** | A primeira partida não ensinava o gesto | Mãozinha animada até o primeiro disparo. Blocos perto do chão ficam assustados, e a música fica mais tensa |
| **Satisfação** | Quebrar 1 ou 10 blocos dava o mesmo feedback | O som sobe na escala pentatônica a cada quebra da jogada. Elogio com texto, som e vibração. Confete em marcos e recordes. Bloco gigante treme a tela |
| **Encaixe** | Blocos simpáticos, mas estáticos | Os olhos seguem a bola mais próxima. Ficam cansados com HP baixo, quicam ao pousar e riem ("^ ^") no fim de jogo. Textos com personalidade |
| **Motivação** | Só recorde e moedas | 5 temas, resumo da partida (blocos, melhor jogada, bolinhas) e dicas variadas |

## Hierarquia das comemorações (uma por rodada)
1. **Novo recorde:** texto dourado, 90 confetes, música abaixa por 1,2 s
2. **Marco de linha** (a cada 50): texto menta, 60 confetes
3. **Elogio** por blocos quebrados na jogada

Uma de cada vez evita a "sopa de feedback": o mais importante sempre aparece.

## Números (valores iniciais, a validar)

| Valor | Inicial | Teste | Se falhar |
|---|---|---|---|
| Elogio "Boa!" | 3 blocos | Aparecer em ~1 a cada 4 rodadas nas linhas 10-40 | Mais frequente que 1 em 2: subir para 4. Raro demais: descer para 2 |
| Degraus do elogio | 3 / 5 / 8 / 12 / 18 | "Lendário!" deve ser raro (< 1 a cada 30 rodadas) | Ajustar o degrau mais alto |
| Marco de linha | a cada 50 | Jogador comum vê 1-2 marcos por partida | Partidas curtas demais: testar a cada 25 |
| Duração do texto grande | 1,5 s | Não pode cobrir a mira da rodada seguinte | Se atrapalhar: 1,1 s |
| Quique ao pousar | 0,28 s, 7% | Deve parecer vivo, não gelatinoso | Reduzir a amplitude para 4% |
| Tensão da música | blocos na antepenúltima linha ou abaixo | O jogador percebe o perigo antes de perder | Disparar uma linha antes |

## Acessibilidade
- **Tremer a tela:** pode ser desligado. Já vem desligado se o aparelho pede movimento reduzido (`prefers-reduced-motion`).
- **Carinhas nos blocos:** podem ser desligadas, para quem prefere só os números.
- **Cores:** o HP sempre aparece em número, então a cor nunca é a única informação.

## Roteiros de playtest
1. **Novo jogador:** entregar o celular sem explicar nada. Ele dispara em até 10 s? Descobre como cancelar a mira?
2. **Estresse:** trocar de tema e de bolinha no meio da partida; abrir e fechar a pausa enquanto as bolas voam; tocar várias vezes em ferramenta bloqueada.
3. **Habilidade:** um jogador experiente deve ver "Incrível!" com frequência bem maior que um iniciante.
4. **Abuso:** sair e voltar para repetir uma rodada boa não deve repetir a comemoração. O recorde comemora uma vez por partida.
5. **Leitura:** quem assiste por cima do ombro sabe dizer por que o jogo acabou? A tela de fim mostra o resumo.
