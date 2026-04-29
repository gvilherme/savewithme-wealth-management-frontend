# Spec: Mobile-First — SaveWithMe

## Contexto

O SaveWithMe é uma aplicação web, mas o volume de acesso esperado é majoritariamente via smartphone. A implementação atual do redesign do Dashboard (spec.md) foi desenvolvida com foco desktop e depois adaptada para mobile, resultando em uma experiência ruim em telas pequenas.

Este documento estabelece os requisitos de experiência mobile como **fonte de verdade**. Qualquer tela nova ou revisão de tela existente deve ser desenhada e implementada **mobile-first**: o layout base é para ~375px e é progressivamente expandido para telas maiores.

---

## Princípio central

> **Mobile não é uma camada de adaptação. É o layout canônico.**

Toda decisão de layout, tipografia, espaçamento, navegação e interação parte do viewport de ~375px. Desktop é uma extensão. Se um componente parece bom no desktop mas quebra no mobile, o componente está errado.

---

## Breakpoints

| Nome | Largura mínima | Uso |
|------|----------------|-----|
| `base` | 0px | Layout mobile — viewport canônico |
| `sm` | 480px | Ajustes pontuais (ex: formulário um pouco mais largo) |
| `md` | 768px | Tablet — grids de 2 colunas começam aqui |
| `lg` | 1024px | Desktop compacto |
| `xl` | 1280px | Desktop — layout completo com sidebar |

A mídia query padrão em todo CSS novo é **`min-width`** (mobile-first). Nunca usar `max-width` para adaptar layout principal.

---

## RM-01: Navegação

### RM-01.1: Mobile (base – md)
- **Deve** exibir uma **bottom navigation bar** fixa na parte inferior da tela
  - Altura mínima: 56px
  - Itens: Dashboard, Transações, Orçamentos, Contas (máx 5 itens)
  - Ícone + label abaixo do ícone, item ativo destacado com cor primária
  - `safe-area-inset-bottom` aplicado para dispositivos com home indicator (iOS)
- **Não deve** exibir sidebar lateral em viewports < 768px
- Menu de configurações / logout: acessado via ícone de perfil no topo direito (header fixo)

### RM-01.2: Desktop (md+)
- Sidebar lateral fixa, comportamento atual mantido
- Bottom bar oculta (`display: none` em md+)

### RM-01.3: Header mobile
- Altura: 52px, fixo no topo
- Conteúdo: logo/nome do app à esquerda, ícone de perfil + toggle de tema à direita
- **Não deve** duplicar a navegação principal que já está na bottom bar

---

## RM-02: Grid e Layout

### RM-02.1: Regra geral
- Layouts de coluna única (`1fr`) são o padrão em `base`
- Grids de 2 colunas só a partir de `md` (768px), salvo exceções explícitas abaixo
- Nunca usar grid de 3+ colunas abaixo de `lg`

### RM-02.2: Dashboard — Cards superiores
- `base`: Card de Saldo ocupa largura total; Card "Sobrou este mês" empilhado abaixo, também largura total
- `md+`: side-by-side em `grid-cols-2`

### RM-02.3: Cards de Conta
- `base`: lista vertical, um card por linha
- `md+`: grade de 2 colunas
- Nunca colocar 2 cards de conta lado a lado em mobile (valores ficam ilegíveis)

### RM-02.4: Lista de Orçamentos
- `base` e `md`: sempre coluna única
- Cada `BudgetRow` precisa de padding horizontal mínimo de 16px e touch target de 44px de altura

### RM-02.5: Stacked Bar ("Para onde foi?")
- `base`: barra horizontal ocupa 100% da largura disponível; legenda abaixo em coluna única
- Labels dentro da barra: omitir texto em segmentos com largura < 32px; usar tooltip/tap para ver valor
- `md+`: legenda pode ficar ao lado da barra

---

## RM-03: Tipografia e Espaçamento

### RM-03.1: Escala tipográfica mobile
| Uso | Tamanho mobile | Tamanho desktop |
|-----|----------------|-----------------|
| Valor principal (saldo) | 28px / 700 | 32px / 700 |
| Valor secundário (cards) | 20px / 600 | 22px / 600 |
| Label de seção | 13px / 600 uppercase | 12px / 600 uppercase |
| Texto de corpo | 14px / 400 | 14px / 400 |
| Caption / badge | 12px / 500 | 11px / 500 |

- Nunca usar fonte menor que 12px em qualquer texto visível
- Line-height mínimo: 1.4 para texto de corpo, 1.2 para títulos grandes

### RM-03.2: Espaçamentos
- Padding horizontal das seções: 16px em `base`, 20px em `sm`, 24px em `md+`
- Gap entre cards: 12px em `base`, 16px em `md+`
- Padding interno de card: 16px em `base`, 20px em `md+`

---

## RM-04: Touch Targets e Interatividade

- Todo elemento clicável/tocável deve ter área mínima de **44×44px** (WCAG 2.5.5)
- Isso vale para: botões, links, itens de menu, ícones de ação, toggles, rows de lista
- Usar `min-height: 44px` + `padding` para atingir o alvo sem aumentar visualmente o elemento
- **Não usar `hover`-only** para revelar ações — em touch não há hover; ações críticas devem estar sempre visíveis ou acessíveis via tap

### RM-04.1: Elementos problemáticos identificados
- Ícone de toggle de tema: garantir área de toque ≥ 44px com padding
- Badge de variação (↑/↓): puramente informativo, não precisa ser tocável
- Botão "Configurar" nos orçamentos: garantir altura ≥ 44px
- Itens da bottom nav: garantir área mínima (ícone + label + padding)

---

## RM-05: Formulários

- Inputs em coluna única em qualquer viewport < 768px
- Nunca colocar 2 inputs lado a lado em mobile
- `font-size` mínimo de **16px nos inputs** — abaixo disso o iOS faz zoom automático ao focar, que quebra o layout
- `CurrencyInput` (RF-09): garantir `font-size: 16px` no campo; teclado numérico via `inputMode="decimal"`
- Labels sempre acima do input (nunca ao lado) em mobile
- Botão de submit: largura de 100% em `base`, auto em `md+`
- Modais e sheets: em mobile, usar bottom sheet (desliza de baixo) em vez de modal centralizado

---

## RM-06: Scroll e Overflow

- O scroll principal da página é **vertical**, nunca horizontal
- Tabelas com muitas colunas: envolver em container com `overflow-x: auto` + scroll horizontal isolado; nunca deixar a página toda scrollar horizontalmente
- Stacked bar: não deve causar overflow horizontal; usar `width: 100%` e `overflow: hidden` no container
- Cards com texto longo: usar `text-overflow: ellipsis` + `overflow: hidden` ou quebra de linha, nunca deixar vazar para fora do card

---

## RM-07: Dark Mode em Mobile

- O toggle de tema no header mobile deve ser acessível sem abrir menu
- Em modo escuro, evitar fundos muito escuros (`#000` ou `#111`) — preferir `#1a1a1a` / `#121212` para reduzir cansaço visual
- Cards no dark mode: borda sutil (1px, cinza escuro) para separar do fundo, não apenas diferença de background
- Bottom navigation bar no dark mode: fundo `--bg-secondary`, borda superior sutil, item ativo com cor primária clara

---

## RM-08: Performance Percebida em Mobile

- Evitar animações longas (> 300ms) que bloqueiem a interação
- Transições de tema (dark/light): máx 200ms, apenas `background-color` e `color` — não animar layout
- Stacked bar: não usar bibliotecas pesadas de chart; a implementação atual em CSS/SVG inline é preferida
- Imagens e ícones: SVG ou icon font; nunca PNG/JPG para ícones de UI
- Evitar `position: fixed` em excesso (só header + bottom nav) — mais elementos fixos causam repaints custosos em mobile

---

## RM-09: Critérios de Aceite

### Obrigatórios antes de qualquer merge em `main`

- [ ] Testado manualmente em **375px** (iPhone SE / Android compacto)
- [ ] Testado manualmente em **390px** (iPhone 14)
- [ ] Testado manualmente em **768px** (iPad / tablet)
- [ ] Sem scroll horizontal em nenhum viewport
- [ ] Bottom navigation visível e funcional em `base`–`md`
- [ ] Sidebar oculta em `base`–`md`; bottom nav oculta em `md+`
- [ ] Nenhum texto menor que 12px em mobile
- [ ] Inputs com `font-size` ≥ 16px (sem zoom automático do iOS)
- [ ] Touch targets ≥ 44px em todos os elementos interativos
- [ ] Stacked bar não causa overflow horizontal
- [ ] Cards de conta em coluna única no mobile
- [ ] Formulários em coluna única no mobile
- [ ] Dark mode funcional e visualmente correto no mobile

### Ferramentas de verificação sugeridas
- Chrome DevTools: toggle device toolbar, viewports 375 / 390 / 768 / 1280
- Firefox Responsive Design Mode
- Lighthouse Mobile (score de Performance + Accessibility)
- Teste em dispositivo físico iOS e Android ao menos uma vez por ciclo de release

---

## RM-10: Regras para Claude (agente de código)

Ao implementar qualquer tela ou componente neste projeto:

1. **Escrever o CSS mobile-first** — o seletor sem media query é o estilo mobile; `@media (min-width: ...)` adiciona desktop
2. **Verificar viewport 375px** antes de declarar uma implementação concluída — abrir DevTools e simular antes de commitar
3. **Não usar `px` fixo para larguras de container** — usar `%`, `vw`, `max-width`, ou unidades de grid
4. **Bottom nav em vez de sidebar** para navegação principal em mobile — não duplicar a sidebar responsiva
5. **Revisar qualquer `grid-cols-2` ou `flex-row`** — garantir que em mobile esteja em coluna única ou justificado corretamente
6. **Inputs sempre com `font-size: 16px` mínimo** — sem exceção

---

## Relação com spec.md

Este documento **complementa** o `spec.md` existente. Os requisitos funcionais (RF-01 a RF-09) permanecem válidos. Onde houver conflito entre `spec.md` e `spec-mobile.md` em questões de layout, **`spec-mobile.md` prevalece**.

Itens da spec.md que precisam ser revisitados à luz deste documento:

| Item | Revisão necessária |
|------|--------------------|
| RF-02 (Card Sobrou) | Empilhar em mobile (já previsto), garantir padding e tipografia |
| RF-03 (Cards de Conta) | Coluna única em mobile obrigatório |
| RF-07 (Stacked Bar) | Labels truncados em segmentos pequenos; legenda em coluna única |
| RF-08 (Dark Mode) | Bottom nav com dark mode aplicado |
| RNF-01 (Responsividade) | Substituído/expandido por este documento |
