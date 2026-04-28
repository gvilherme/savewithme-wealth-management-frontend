# Plano de Execução — Redesign do Dashboard

> Gerado em: 2026-04-16  
> Base: `spec.md` · Branch atual: `feature/budgets`

---

## Mapa: componentes atuais → propostos

| Atual | Destino |
|-------|---------|
| Card verde (saldo + meta receita embutida) | RF-01: Card de Saldo — só saldo + variação % |
| _(inexistente)_ | RF-02: Card "Sobrou este mês" |
| `BudgetRow` (barra + texto) | RF-06: BudgetRow com 5 estados visuais |
| _(inexistente)_ | RF-04: Resumo Crítico (banner âmbar) |
| Lista de orçamentos (não ordenada) | RF-05: ordenada por % desc, zeros no fim |
| _(inexistente)_ | RF-07: Stacked bar "Para onde foi?" |
| Cards de conta (sem variação) | RF-03: cards + badge variação 7 dias |
| `fmt` inline em cada arquivo | RF-09: `<CurrencyText>` + `<CurrencyInput>` |
| Sem tema escuro | RF-08: dark mode com tokens CSS |

---

## Análise de dados — lacunas vs API existente

| Dado necessário | Endpoint/fonte | Disponível? |
|-----------------|----------------|-------------|
| Saldo atual por conta | `GET /accounts` | ✅ |
| Receitas/despesas do mês | `GET /transactions?from=&to=&type=` | ✅ derivar |
| Progresso de orçamentos | `GET /user/:id/budgets/:y/:m/progress` | ✅ |
| Gastos por categoria (mês) | `GET /transactions?from=&to=&type=EXPENSE` + join local com `categories` | ✅ derivar |
| **Saldo em data anterior** (RF-01 variação %) | ❌ sem endpoint histórico | **VER PERGUNTA #1** |
| **Variação semanal por conta** (RF-03) | Parcialmente — `GET /transactions?accountId=&from=&to=` existe, mas requer uma query por conta | ✅ derivar (custoso) |

---

## Decisões tomadas (2026-04-16)

| # | Decisão |
|---|---------|
| P1/P2 | Derivar saldo histórico via transactions. Gerar débito técnico. |
| P3 | Usar `category.color` se preenchido; palette por índice como fallback. |
| P4 | Dark mode aplicado no app inteiro. |
| P5 | Forms em centavos (int); API em reais (float). `CurrencyText` recebe reais. |

---

## Débitos técnicos

### DT-01 — Saldo histórico derivado de transactions
**Onde:** RF-01 (variação % mês anterior) e RF-03 (variação semanal por conta)  
**O que:** O cálculo de saldo em data anterior é feito somando transactions desde essa data até hoje e subtraindo do saldo atual. Funciona enquanto todo o histórico estiver na base, mas falha se houver lançamentos retroativos, importações ou ajustes manuais de saldo.  
**Solução ideal:** Endpoint `GET /accounts/balance-at?date=YYYY-MM-DD` ou snapshots periódicos de saldo no backend.  
**Risco atual:** baixo (base ainda pequena e sem importação em lote).

---

## Fases de execução

### Fase 1 — Fundação monetária (RF-09) `[em andamento]`
> Tudo o mais usa formatação de moeda. Fazer uma vez, certo.

- [x] Criar `src/components/ui/CurrencyText.tsx` — props: `value`, `showSign`, `colorize`, `size`, `overrideCurrency`
- [x] Criar `src/components/ui/CurrencyInput.tsx` — mask pt-BR, paste normalizado, centavos no onChange
- [x] `AppLayout` — remove `fmtMoney`, usa `CurrencyText` com `overrideCurrency` no AlertPanel
- [x] `TransactionsPage` — remove `AmountInput` local, usa `CurrencyInput`; corrige selector duplicado INCOME
- [x] `BudgetSetupPage` — `CategoryRow` usa `CurrencyInput`; estado em centavos; save converte ÷100
- [x] `DashboardPage` — reescrita completa; `fmt` removido, usa `useFmt` + `CurrencyText`
- [x] `AccountsPage` — `fmt` removido, usa `CurrencyText`; saldo inicial migrado para `CurrencyInput`
- [x] Remover helpers duplicados após migração completa

### Fase 2 — Dashboard: cálculos com dados existentes `[concluída]`

- [x] **RF-02** Card "Sobrou este mês" — `monthIncome - monthExpenses`, breakdown receita/gasto
- [x] **RF-04** Banner crítico âmbar — só quando `remainingAmount < 0`; exibe N de M + total excedido
- [x] **RF-05** Ordenação por % desc, zeros no fim, empate alfabético (`useMemo`)
- [x] **RF-06** 5 estados visuais: empty / ok / warning / limit / over — barra + cor % + texto status
- [x] **RF-07** Stacked bar — EXPENSE agrupado por categoria, top3 + Outros, legenda, cores da spec

### Fase 3 — Dashboard: variações históricas `[concluída]`
> Derivado via transactions (DT-01 ativo).

- [x] **RF-01** Badge `↑/↓ X% vs mês anterior` no card de saldo — derivado de `prevDeltaTx`; oculto se variação < 0.05% ou sem histórico
- [x] **RF-03** Badge `↑/↓ R$ X esta semana` por conta — query única last 7d, agrupado localmente; oculto se net = 0

### Fase 4 — Dark mode (RF-08) `[concluída]`
> Maior escopo; deixar para depois da estabilização do Dashboard.

- [x] Script no-FOUC em `index.html` (lê localStorage antes do bundle)
- [x] Definir tokens CSS em `src/index.css` (light + dark)
- [x] `ThemeContext` + hook `useTheme` com persistência e listener `matchMedia`
- [x] Toggle de tema (3 estados: light / dark / system) — colocado no AppLayout (sidebar + topbar mobile)
- [x] Migrar Dashboard para tokens (card verde com dark: adjustments, badges)
- [x] Migrar demais telas (AppLayout, Transactions, CurrencyText)
- [ ] Validar contraste WCAG AA

### Fase 5 — Testes `[ ]`
> Rodar após Fase 2 e 3 estáveis.

- [ ] Cálculo "sobrou no mês"
- [ ] Ordenação de orçamentos
- [ ] Lógica dos 5 estados de BudgetRow
- [ ] Cálculo do resumo crítico (contagem + valor excedido)
- [ ] `CurrencyText` / `CurrencyInput`: negativo, zero, null, grandes valores
- [ ] Parsing de paste no `CurrencyInput`

---

## Progresso geral

| Fase | Status |
|------|--------|
| Fase 1 — RF-09 CurrencyText/Input | `concluída` |
| Fase 2 — Dashboard dados existentes | `concluída` |
| Fase 3 — Variações históricas | `concluída` |
| Fase 4 — Dark mode | `concluída (validação WCAG pendente)` |
| Fase 5 — Testes | `pendente` |
