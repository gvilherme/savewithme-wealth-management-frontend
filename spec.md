# Spec: Redesign do Dashboard Financeiro

## Contexto
Refatoração visual e estrutural do dashboard principal. O design atual funciona mas mistura conceitos (saldo + meta de receita no mesmo card), não prioriza visualmente o que é crítico, e falta informação essencial sobre o fluxo do mês.

## Objetivos
1. Separar claramente **patrimônio** (saldo) de **fluxo** (receita/gastos do mês)
2. Fazer o usuário entender o estado das finanças em <5 segundos
3. Priorizar visualmente orçamentos estourados sem criar pânico desnecessário
4. Adicionar visibilidade da distribuição de gastos

## Escopo
Apenas a tela `Dashboard`. Não alterar lógica de cálculo de saldo, integração com contas, ou fluxo de cadastro de orçamentos.

---

## Requisitos funcionais

### RF-01: Card de Saldo Total
- **Deve** exibir o saldo consolidado de todas as contas ativas
- **Deve** exibir o número de contas ativas
- **Deve** exibir variação percentual em relação ao saldo do mês anterior (mesmo dia do mês)
  - Cálculo: `((saldo_atual - saldo_mes_anterior) / saldo_mes_anterior) * 100`
  - Se não houver dado do mês anterior, ocultar o badge de variação
  - Formato: `↑ X,X% vs mês anterior` (verde se positivo) ou `↓ X,X% vs mês anterior` (vermelho se negativo)
- **Não deve** mais exibir a meta de receita do mês embutida neste card

### RF-02: Card "Sobrou este mês" (novo)
- **Deve** exibir ao lado do card de saldo, em grid 1fr 1fr no desktop
- **Deve** calcular: `total_receitas_mes - total_despesas_mes_ate_hoje`
- **Deve** exibir breakdown: "Receita: R$ X | Gastos: R$ Y"
- **Deve** exibir subtítulo: "Receita − despesas até hoje"
- No mobile (<768px): empilhar abaixo do card de saldo

### RF-03: Cards de Contas
- **Deve** manter estrutura atual (tipo da conta + nome + saldo)
- **Deve** adicionar indicador de variação da última semana (últimos 7 dias)
  - Formato: `↑ R$ X esta semana` (verde) ou `↓ R$ X esta semana` (vermelho)
  - Posicionado no canto superior direito do card
  - Se variação = 0 ou sem dados, ocultar

### RF-04: Resumo Crítico de Orçamentos (novo)
- **Deve** ser exibido acima da lista de orçamentos, **apenas** se houver ≥1 categoria estourada (>100%)
- **Deve** exibir:
  - Contagem: "N de M categorias estouradas"
  - Valor total excedido: soma de `(gasto - limite)` para todas categorias com gasto > limite
- Estilo: background amarelo/âmbar (não vermelho), ícone de alerta, texto em tom âmbar escuro

### RF-05: Lista de Orçamentos — Ordenação
- **Deve** ordenar categorias por percentual de uso, **decrescente**
  - Empate: ordem alfabética
- Categorias com 0% vão para o final

### RF-06: Lista de Orçamentos — Estados visuais
A barra de progresso e o texto de status têm 4 estados baseados no percentual (`gasto / limite * 100`):

| Estado | Percentual | Cor da barra | Cor do % | Texto de status |
|--------|------------|--------------|----------|-----------------|
| Sem uso | 0% | Verde (barra em 0%) | Cinza secundário | "R$ X restante" |
| Saudável | 1–79% | Verde | Cinza secundário | "R$ X restante" |
| Atenção | 80–99% | Laranja (já implementado) | Laranja | "R$ X restante" |
| No limite | 100% (exato) | Âmbar | Âmbar escuro | "Limite atingido" |
| Estourado | >100% | Vermelho | Vermelho | "−R$ X acima" |

**Importante:** o estado "No limite" (100% exato) **não deve** mais ser exibido em vermelho. Só vermelho para estouro real (>100%).

### RF-07: Seção "Para onde foi seu dinheiro" (nova)
- **Deve** ser exibida após a lista de orçamentos
- **Deve** exibir:
  - Subtítulo com total gasto no mês: "Distribuição dos R$ X gastos este mês"
  - Barra horizontal empilhada (stacked bar) mostrando proporção de cada categoria com gasto > 0
  - Legenda abaixo com top 3 categorias (nome + percentual)
  - Categorias fora do top 3 agrupadas como "outros" na barra
- Cada categoria deve ter cor consistente (definida no design system, ver abaixo)

### RF-08: Modo escuro (novo)

#### RF-08.1: Detecção e persistência
- **Deve** suportar 3 estados de preferência: `light`, `dark`, `system`
- **Deve** adotar `system` como default em primeira visita
- **Deve** persistir a escolha do usuário em `localStorage` com a chave `theme-preference`
- **Deve** ler `prefers-color-scheme` via `window.matchMedia('(prefers-color-scheme: dark)')` quando o estado for `system`
- **Deve** reagir em tempo real a mudanças do sistema quando estiver em modo `system` (listener no matchMedia)
- **Deve** aplicar o tema **antes** da hidratação/render para evitar flash de tema errado (FOUC)
  - Sugestão: script inline no `<head>` que lê `localStorage` e adiciona classe/atributo no `<html>` antes do bundle carregar

#### RF-08.2: Toggle de tema
- **Deve** expor um controle de alternância acessível em local visível (header ou menu de configurações)
- **Deve** ciclar entre os 3 estados ou expor opções explícitas (light / dark / system)
- **Deve** ter `aria-label` descritivo indicando o estado atual e a ação
- Ícones sugeridos: sol (light), lua (dark), monitor (system)

#### RF-08.3: Tokens de cor
- **Deve** definir tokens semânticos em CSS (custom properties) em vez de cores hard-coded
  - Exemplos: `--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--border-subtle`, `--accent-success`, `--accent-warning`, `--accent-danger`, `--brand-primary`
- **Deve** manter os tokens semânticos iguais entre os temas; só os valores mudam
- **Deve** escopar os tokens via `[data-theme="dark"]` no `<html>` (ou classe equivalente)
- Tokens de marca (verde principal, âmbar, vermelho) podem ter variante dedicada para dark mode com luminosidade ajustada para manter contraste AA

#### RF-08.4: Aplicação nos componentes do Dashboard
- Card de saldo verde: ajustar brilho/saturação no dark mode para não "queimar" a tela
- Cards brancos: migrar para `--bg-secondary` com borda sutil
- Texto em cima de cores sólidas (badges, alertas): revisar contraste caso a caso
- Stacked bar: as cores por categoria devem ter versão dark otimizada (mesma matiz, luminosidade ajustada)
- Barras de progresso: background do track deve ser visível no dark mode (cinza médio, não cinza quase-preto)

#### RF-08.5: Contraste e acessibilidade
- **Deve** atender WCAG AA em ambos os temas (4.5:1 para texto normal, 3:1 para texto grande e componentes gráficos)
- **Deve** validar estados: default, hover, focus, disabled em ambos os temas
- Focus ring deve ser visível em ambos os temas (cor e espessura podem diferir)

#### RF-08.6: Critérios de aceite específicos
- [ ] Sem FOUC ao carregar a página com tema dark salvo
- [ ] Toggle persiste entre reloads
- [ ] Modo `system` reage a mudança de tema do SO sem reload
- [ ] Todos os componentes do Dashboard renderizam corretamente em ambos os temas
- [ ] Contraste validado com ferramenta (axe, Lighthouse ou similar) em ambos os temas
- [ ] Screenshots de regressão visual para light e dark

---

### RF-09: Padronização de campos monetários (novo)

#### RF-09.1: Escopo
- **Deve** aplicar-se a **todo o app**, não só ao Dashboard
- Cobre: inputs de formulários, exibição em listas, cards, relatórios, modais, tooltips e qualquer outro lugar onde valores em dinheiro sejam mostrados ou editados
- **Não** cobre: percentuais, quantidades, IDs, códigos

#### RF-09.2: Formato de exibição (read-only)
- **Deve** usar `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` como única fonte de formatação
- Formato canônico: `R$ 1.234,56`
- Valores negativos: `-R$ 1.234,56` (sinal antes do símbolo, padrão pt-BR)
- Zero: `R$ 0,00` (nunca `R$ 0` ou `—` sem opt-in explícito do componente)
- **Não deve** aparecer em nenhum lugar: valores sem símbolo, sem separador de milhar, com ponto decimal, ou com 0/1/3+ casas decimais

#### RF-09.3: Componente único de exibição
- **Deve** criar um componente reutilizável (ex: `<CurrencyText value={...} />` ou equivalente no framework usado)
- **Deve** aceitar props para:
  - `value`: número (em unidade inteira ou em centavos — padronizar uma convenção e documentar)
  - `showSign`: boolean (força exibir `+` em positivos, útil em variações)
  - `colorize`: boolean (aplica cor verde/vermelho conforme sinal)
  - `size`: variações tipográficas pré-definidas
- **Deve** substituir toda formatação inline (`toFixed`, template strings manuais, etc.) por esse componente

#### RF-09.4: Componente único de input
- **Deve** criar um componente reutilizável (ex: `<CurrencyInput />`) para entrada de valores monetários
- **Deve** formatar o valor enquanto o usuário digita (mask pt-BR)
- **Deve** aceitar apenas dígitos e um separador decimal; bloquear letras e caracteres inválidos
- **Deve** expor o valor numérico puro no `onChange` (não a string formatada)
- **Deve** ter alinhamento à direita do texto (padrão para inputs monetários)
- **Deve** exibir prefixo `R$` visível dentro ou ao lado do campo
- **Deve** suportar valor inicial, placeholder, estado desabilitado e erro
- Colar (paste) deve aceitar `1234.56`, `1.234,56`, `R$ 1.234,56`, `1234`, etc., normalizando

#### RF-09.5: Convenção de armazenamento
- **Deve** documentar e padronizar como valores são armazenados internamente (ex: sempre em centavos como inteiros, ou sempre em reais como decimal com 2 casas)
- **Deve** garantir que conversões de/para string sejam feitas apenas nas bordas (UI e I/O), nunca no meio da lógica
- **Não deve** fazer aritmética direta com floats; usar inteiros em centavos ou biblioteca decimal (ex: `dinero.js`, `big.js`) para evitar erros de precisão

#### RF-09.6: Migração
- **Deve** listar (como checklist) todos os pontos do app onde valores monetários aparecem hoje
- **Deve** migrar todos esses pontos para usar os componentes padrão
- **Deve** remover helpers e utilitários de formatação duplicados após a migração
- **Deve** adicionar lint rule ou teste que detecte uso de formatação inline de moeda (regex em PRs ou similar) para evitar regressão

#### RF-09.7: Critérios de aceite específicos
- [ ] Componentes `CurrencyText` e `CurrencyInput` existem e estão documentados
- [ ] Todos os pontos do app usam um dos dois (zero formatação inline)
- [ ] Valores negativos, zero e grandes (milhões) renderizam corretamente
- [ ] Inputs aceitam digitação fluida e colagem de diferentes formatos
- [ ] Não há mais uso direto de `toFixed`, `toLocaleString` ou template strings para moeda fora desses componentes
- [ ] Testes unitários cobrem: formatação, parsing de input, casos extremos (negativo, zero, null, undefined)
- [ ] Aritmética monetária em toda a codebase usa centavos inteiros ou lib decimal — sem operações diretas com floats

---

## Requisitos não-funcionais

### RNF-01: Responsividade
- Breakpoint mobile: 768px
- Em mobile, grids 1fr 1fr viram 1fr (empilhados)
- Touch targets mínimos de 44x44px em elementos clicáveis

### RNF-02: Performance
- Sem regressão no tempo de render da tela
- Cálculos derivados (ordenação, resumo crítico, stacked bar) memoizados se em React

### RNF-03: Acessibilidade
- Contraste mínimo WCAG AA em todos os textos
- Barras de progresso com `role="progressbar"` e `aria-valuenow`
- Badges de variação com `aria-label` descritivo (ex: "Aumento de 3,2% vs mês anterior")

### RNF-04: Formatação
- Valores monetários: `R$ X.XXX,XX` (pt-BR, usar `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`)
- Percentuais: inteiros quando possível (`100%`, não `100,0%`), uma casa decimal só quando necessário (`3,2%`)

---

## Referência visual
Ver mockup aprovado (anexar screenshot). Cores:
- Verde primário: `#0F6E56` (saldo, valores positivos)
- Âmbar: `#BA7517` / texto `#854F0B` (no limite, alerta consolidado)
- Vermelho: `#A32D2D` (estourado, valores negativos)
- Laranja de atenção: manter o atual já implementado

Cores das categorias na stacked bar (ramp do design system, uma por categoria, consistentes):
- Alimentação, Transporte, Moradia, Saúde, Lazer, Outros → mapear cada uma a uma cor fixa

---

## Critérios de aceite

- [ ] Card verde exibe só saldo + variação vs mês anterior, sem meta de receita
- [ ] Card "Sobrou este mês" renderiza corretamente com receita − despesas
- [ ] Cards de conta exibem variação semanal quando há dados
- [ ] Resumo crítico aparece apenas quando há categorias estouradas e mostra contagem + valor total excedido
- [ ] Orçamentos ordenados por % decrescente, zeros no fim
- [ ] Categoria em 100% exato renderiza em âmbar com texto "Limite atingido", **não** em vermelho
- [ ] Seção "Para onde foi seu dinheiro" renderiza stacked bar + legenda top 3
- [ ] Layout responsivo funciona em 375px, 768px e 1440px
- [ ] Sem regressão visual em outras telas que compartilhem componentes
- [ ] Testes unitários para: cálculo de "sobrou no mês", ordenação de orçamentos, estados das barras de progresso, cálculo do resumo crítico

---

## Fora de escopo
- Alterar estrutura de dados de contas ou orçamentos
- Adicionar novas categorias de orçamento
- Funcionalidade de edição inline dos orçamentos (manter botão "Configurar" atual)
- Notificações push por estouro de orçamento
- Histórico mensal completo (só a comparação mês anterior do card de saldo)

---

## Plano de execução sugerido
1. Ler o código atual do Dashboard e mapear componentes existentes
2. Propor estrutura de componentes (quais reusar, quais criar, quais refatorar)
3. Identificar de onde virão os dados novos (variação mensal, variação semanal, gastos por categoria) — se algum não existir no backend/store, sinalizar antes de implementar
4. Implementar componente por componente, começando pelo topo
5. Adicionar testes
6. Validar responsividade manualmente em 3 breakpoints

**Antes de começar a codar, me mostre:**
- O mapa de componentes atuais vs propostos
- Quais dados novos precisam ser expostos e se já existem na camada de dados atual
- Qualquer decisão ambígua que encontrar na spec