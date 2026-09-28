---
name: zeno-cash-e2e-test
description: Full end-to-end manual/UI test of Zeno Cash (web and Android) covering every screen, setting, transaction type, debts, credit cards, invoices, Home month switching and filters. Use when asked to test the whole app, run a regression pass, or validate a PR end-to-end.
---

# Zeno Cash – full E2E test

Goal: exercise every user-facing feature and verify that balances, invoices, debts and
lists stay consistent across screens. Record results as a table (case id, result, notes,
screenshot) and report failures with repro steps.

When testing a specific PR, run the whole checklist but prioritise the sections the PR
touches, and check out the PR branch first.

## 0. Setup

```bash
cd ~/repos/Zeno-Cash
npm install
```

### Web (fast path, default)
```bash
npx expo start --web --port 8081     # open http://localhost:8081
```
- The web build uses sql.js. Check whether data survives a page reload (it depends on
  whether localStorage persistence is enabled in the build under test).
- A "🧪 Ambiente de Teste (Web)" panel (`src/components/WebMockPanel.js`) is rendered next
  to the app: simulate notifications, reset DB (re-seed) and "Avançar 30 Dias (Time Travel)".
- `Alert.alert` confirmations show up as browser `confirm()` dialogs — accept them.
- Native-only (skip on web, mark "untested (web)"): notification listener, widgets,
  Google Sign-In / Drive backup, file sharing, haptics, swipe gestures may be awkward
  (use mouse drag).

### Android (native path)
```bash
npx expo run:android      # needs emulator running; dev build, not Expo Go
```
- If Gradle gets HTTP 429 from Maven Central, configure a mirror in `~/.gradle/init.gradle`.
- A `ForegroundServiceDidNotStartInTimeException` crash from
  `react-native-android-notification-listener` can happen on some emulators; it is not
  reproducible on real devices. Note it but do not report it as an app bug.
- Google Sign-In needs `EXPO_PUBLIC_WEB_CLIENT_ID` in the build environment; without it
  login fails.

### Seed data (after reset)
- Accounts: `Nubank` (checking, 2450.80), `Carteira / Dinheiro` (cash, 220.00).
- Card: `Cartão Nubank Ultravioleta` (credit, closing 25, due 5, limit 12000, pays from Nubank).
- Debts: Gabriel Santos owed 350 (open), Beatriz Martins owed 85.50 (open),
  Matheus Costa owe 220 (open), Rodrigo Alves owed 60 (paid) + split debts
  (Lucas Ferreira, Mariana Duarte) attached to transactions.
- Always start from "Resetar Banco de Dados" so numbers are reproducible. Write down every
  account balance, card invoice total and Home debt totals BEFORE each section; every
  assertion below is "value changed by exactly X" against those notes.

## 1. Navigation smoke
Tabs: Home, Transações, Análise, Investimentos (can be hidden), Config.
Stack screens: Debts (Controle de Dívidas), CreditCard, RecurrenceDetails, ExtractionReview.
- [ ] Each tab opens without red screen / ErrorBoundary.
- [ ] Back buttons in Debts, CreditCard, RecurrenceDetails return to the previous screen.

## 2. Home
- [ ] "Balanço do Período" shows total, Receitas, Despesas.
- [ ] MonthSelector: scroll left/right → centre month becomes the only selection, totals
      and recent list change to that month.
- [ ] Tap extra months → multi-select; totals equal the sum of the individual months.
      Tap a selected month again → it is removed (never empty selection crash).
- [ ] Go to a month with no transactions → zeros, no crash. Go to a future month → only
      pending/virtual recurrences counted as expected.
- [ ] Accounts list: tap an account → Transações opens filtered by that account.
- [ ] Cards list: tap a card → CreditCard screen for that card.
- [ ] Pendências (HomePendingTx): swipe right = accept (becomes confirmed, balance moves),
      swipe left = delete (disappears, balance unchanged).
- [ ] Últimas transações: no pending, no ignored, no future items; notes never show
      `[invoice:…]` or `[debt:…]` tags.
- [ ] Dívidas card: "Me devem" / "Eu devo" totals equal the open (unpaid) totals in the
      Debts screen; tapping navigates to Debts.
- [ ] FAB (+) opens an empty TransactionModal.

## 3. Transactions (TransactionModal)
For each case: create → verify list, Home, account/card balance → edit → verify → delete →
verify everything returns to the baseline.
- [ ] T1 Despesa única em conta corrente (balance −X).
- [ ] T2 Receita única em conta corrente (balance +X).
- [ ] T3 Despesa em dinheiro (cash account).
- [ ] T4 Despesa no cartão → lands in the right invoice (purchase before/after closing day 25).
- [ ] T5 Assinatura (subscription): "A cada" N Dias and N Meses; future virtual items appear
      with the recurrence icon; "Ver Detalhes do Contrato" opens RecurrenceDetails.
- [ ] T6 Parcelada: 12 parcelas, no interest; each "Parcela i/12" = amount/12.
- [ ] T7 Parcelada com juros Simples and Composto; values match the formula.
- [ ] T8 Future date → shows as pending/scheduled, not in current balance.
- [ ] T9 Title autocomplete suggests previous titles; category auto-resolves from rules.
- [ ] T10 Notes: add a note, save, reopen → note preserved; hidden tags preserved on edit.
- [ ] T11 Validation: empty amount / zero / letters → blocked or sanitised, no crash.
- [ ] T12 Cancelar and closing the modal never create or change anything.
- [ ] T13 Apagar asks for confirmation; recurrence delete behaves per contract.
- [ ] T14 Change type expense↔income and account on edit → both old and new balances fix.

### Split (Dividir / Pessoas na divisão)
- [ ] S1 Add 2 people with fixed amounts → debts created in Debts screen, linked icon (people).
- [ ] S2 Percentage split (isPercentage) → amounts computed correctly.
- [ ] S3 "Sem Juros" on an installment split.
- [ ] S4 Mark "Já pagou?" on one person → an "Acerto" transaction is created on the SAME
      account/card as the parent transaction, dated today, no account picker shown.
- [ ] S5 Un-mark → Acerto removed, balance back.
- [ ] S6 Edit the parent transaction (amount/title) several times → no duplicate Acertos,
      debt ids preserved; removing a person deletes only that debt (and its Acerto).
- [ ] S7 Delete the parent transaction → linked debts/Acertos handled without orphans.

## 4. Transactions tab (list + filters)
- [ ] Account chips: "Todas as Contas" and each account filter correctly.
- [ ] Type: Tudo / Receitas / Despesas / Recorrências.
- [ ] Period: 30D / 90D / Sempre; forecast: S/ Previsão / +30D / +60D (virtual items appear).
- [ ] Advanced filters: custom start/end dates (date picker works on the platform),
      multi-select categories, combined filters.
- [ ] Search text (if present) combined with filters.
- [ ] Swipe on pending item → accept; swipe delete → confirm and removed.
- [ ] Tap item → modal opens pre-filled; edit persists.
- [ ] Acertos hidden when Config → Módulos → "[Geral] Esconder Acertos de Dívidas nas
      Transações" is ON (default); visible when OFF. Same for Home recent list.
- [ ] Extraction (Extratos) button without API key → "Chave API Ausente" alert.

## 5. Debts (Controle de Dívidas)
- [ ] Totals "Eu Devo" / "Me Devem" match Home and include only unpaid debts.
- [ ] Debts grouped by person; expand/collapse group; long names/descriptions truncate
      without overlapping the amount.
- [ ] D1 New standalone debt (Me Devem), unpaid → no transaction created.
- [ ] D2 Mark D1 paid → account picker "Em qual conta o dinheiro movimentou?" shown;
      income Acerto created in chosen account dated today; debt leaves totals.
- [ ] D3 Standalone "Eu Devo" paid → expense Acerto.
- [ ] D4 Change account of a paid debt → Acerto moves accounts (no duplicates).
- [ ] D5 Change amount of a paid debt → Acerto amount updated.
- [ ] D6 Mark unpaid → Acerto removed, balances restored.
- [ ] D7 Delete a paid debt → Acerto removed.
- [ ] D8 Delete the Acerto transaction from Transações → debt re-opens (isPaid 0).
- [ ] D9 Linked debt (from split): NO account picker; "Transação" button opens the parent;
      paying it creates Acerto on parent's account/card.
- [ ] D10 Linked debt on credit card, marked paid in a later month → Acerto dated today but
      shown in the SAME invoice as the purchase; previous invoice unchanged.
- [ ] D11 Recurrence-generated debts (split on a subscription) behave like D9 per instance.
- [ ] D12 Closing the modal with X never creates an Acerto.

## 6. Credit cards / invoices (CreditCard screen)
- [ ] Invoice month navigation; "Total da Fatura" = previous balance + month spend − credits.
- [ ] Purchase on day ≤ closing vs > closing lands in the correct invoice.
- [ ] "Saldo Fatura Anterior" row appears when the previous invoice wasn't fully paid.
- [ ] Acertos ALWAYS visible here, even with the hide-Acertos setting ON.
- [ ] "Adicionar Encargo" adds a fee/interest to the invoice.
- [ ] Pagar Fatura → PayInvoiceModal: Pagamento Integral, Apenas Mês Atual, Pagamento
      Parcial (custom value). Each: expense on the associated checking account, invoice
      reduced accordingly, "Pagamento registrado com sucesso!".
- [ ] Card without associated account → error alert about configuring Contas.
- [ ] Credit limit usage on Home cards list updates after purchases/payments.
- [ ] Installment purchase spreads across future invoices.

## 7. Recurrence details
- [ ] Shows Valor Base, Tipo, Juros, Data de Início, Divisão Global, Status.
- [ ] Edit / pause / end contract; list of generated instances; notes without hidden tags.
- [ ] Time Travel (web panel "Avançar 30 Dias") → new instances materialise as pending.

## 8. Análise
- [ ] Filters: Período, Previsão, Tipo, Conta change every chart consistently.
- [ ] Modules render: KPI summary, Cash flow, Monthly evolution, Expense composition,
      Category ranking, Top villains, Weekly heatmap, Account analysis, Recurrence
      analysis, Smart insights. No NaN/Infinity with empty data (test after reset + delete all).

## 9. Investimentos
- [ ] "+ Novo Ativo" create, edit, delete; "Patrimônio Acumulado" updates.
- [ ] Long names truncate without cutting the value.

## 10. Config
- [ ] Temas: select each default theme; create custom theme (name required → "Dê um nome"),
      colours, font, zoom 1.0/1.2; delete custom (default themes cannot be deleted).
- [ ] Contas: create checking, cash, credit card (limit, closing/due day, auto-debit account,
      quick banks, icon/web logo, colour); edit; delete with confirmation. Credit card
      without any checking account shows the warning. Long names don't push actions off.
- [ ] Categorias: create (name, macro group, icon, colour), edit, delete (transactions lose
      category, no crash).
- [ ] Módulos: toggle every switch ([Geral] Investimentos tab, hide Acertos, [Home]
      Pendências/Contas/Cartões/Últimas/Dívidas) and verify effect; reorder Home and
      Análise modules; macro groups + category→macro mapping + targets.
- [ ] Automações: notification listener toggle (Android only; web simulate via panel:
      Pix Nubank, Compra Itaú, Salário, Netflix cartão → transactions created and
      categorised).
- [ ] Extratos: enable, provider, model, API key saved (don't use real keys unless given).
- [ ] Comportamento Padrão: 30d / 90d / all → applied after restart.
- [ ] Backup: frequency, limit, Exportar JSON, Exportar CSV, Google Drive backup/restore
      (Android + credentials only), Zona de Perigo wipe → app returns to empty state.

## 11. Persistence
- [ ] Android: create data, force-stop/reopen → everything still there.
- [ ] Web: reload page → note whether data persists (only if the web build persists to localStorage).
- [ ] Settings (theme, module toggles, default period) persist after restart.

## 12. Cross-screen consistency (final check)
After all sections, for each account compare: Home account balance == sum of its
transactions (confirmed, not future) + initial balance == Transações filtered by that
account. Home debt totals == Debts screen totals. Card invoice totals == CreditCard screen.

## Reporting
- Table of all case ids with passed / failed / untested (+ reason, e.g. "native only").
- For each failure: steps, expected vs actual, screenshot, suspected file.
- Known non-bugs: emulator-only notification-listener crash, Google Sign-In failing when
  `EXPO_PUBLIC_WEB_CLIENT_ID` is not set.
