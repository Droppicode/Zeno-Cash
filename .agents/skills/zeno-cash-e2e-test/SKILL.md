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
- The web build uses sql.js. With localStorage persistence, reload keeps data; builds
  without it re-seed on reload. Restart Metro and reload after switching branches.
- A "🧪 Ambiente de Teste (Web)" panel (`src/components/WebMockPanel.js`) is rendered next
  to the app: simulate notifications, reset DB (re-seed) and "Avançar 30 Dias (Time Travel)".
- In web/dev, reset followed by reload re-seeds the two demo groups (`Viagem Alagoas 2026`
  and `Carro Fiesta`); assert disposable QA records disappeared rather than expecting every
  table to be empty.
- `Alert.alert` is a no-op in react-native-web unless the app polyfills it with browser
  `confirm()`/`alert()`. Verify each confirmation path (e.g. deleting an account) actually
  opens a dialog and completes.
- JSON/CSV export works on web as a browser download; verify the downloaded files are valid
  and record counts match the app.
- Native-only (skip on web, mark "untested (web)"): notification listener, widgets,
  Google Sign-In / Drive backup, device backups, haptics. Swipe gestures may be awkward
  (use mouse drag).
- After switching branches, check console errors in a fresh tab; hot-reload history can
  contain errors from the previous branch.

### Android (native path)
```bash
npx expo run:android      # needs emulator running; dev build, not Expo Go
```
- Known-good toolchain: Node 20, Java 17, Android SDK build-tools 36, API 35 emulator with KVM.
- To reuse a running Metro: `npx expo run:android --no-bundler` (don't combine with
  `--port`) and `adb reverse tcp:8081 tcp:8081`.
- If stylus handwriting intercepts text input:
  `adb shell settings put secure stylus_handwriting_enabled 0`.
- Make sure the field is focused before `adb shell input text`; repeated `R` keystrokes can
  trigger a React Native dev reload.
- If Gradle gets HTTP 429 from Maven Central, configure a mirror in `~/.gradle/init.gradle`.
- A `ForegroundServiceDidNotStartInTimeException` crash from
  `react-native-android-notification-listener` can happen on some emulators; it is not
  reproducible on real devices. Save the crash log, reopen and continue, and do not report
  it as an app bug. If `adb` is not on PATH, use the full SDK path from
  `$ANDROID_HOME/platform-tools/adb`.
- Google Sign-In needs `EXPO_PUBLIC_WEB_CLIENT_ID` in the build environment; without it
  login fails.

### Seed data (after reset)
- Accounts: `Nubank` (checking, opening balance 2450.80), `Carteira / Dinheiro` (cash,
  opening balance 220.00). These are opening balances, not the displayed balances.
- Card: `Cartão Nubank Ultravioleta` (credit, closing 25, due 5, limit 12000, pays from Nubank).
- Debts: Gabriel Santos owed 350 (open), Beatriz Martins owed 85.50 (open),
  Matheus Costa owe 220 (open), Rodrigo Alves owed 60 (paid) + split debts
  (Lucas Ferreira, Mariana Duarte) attached to transactions.
- Historical seed transactions are randomised, so a reset does NOT make totals
  reproducible. Write down every displayed account balance, card invoice total and Home
  debt totals BEFORE each section; every assertion below is "value changed by exactly X"
  against those notes.
- Seeded paid split debts may not have an Acerto yet until they are saved again; account
  for that when editing a seeded parent transaction.

## 1. Navigation smoke
Tabs: Home, Transações, Análise, Investimentos (can be hidden), Config.
Stack screens: Debts (Controle de Dívidas), CreditCard, RecurrenceDetails, ExtractionReview.
- [ ] Each tab opens without red screen / ErrorBoundary.
- [ ] Back buttons in Debts, CreditCard, RecurrenceDetails return to the previous screen.

## 2. Home
- [ ] "Balanço do Período" shows total, Receitas, Despesas.
- [ ] MonthSelector: scroll left/right → centre month becomes the only selection and the
      period totals change to that month.
- [ ] Tap extra months → multi-select; totals equal the sum of the individual months.
      Tap a selected month again → it is removed (never empty selection crash).
- [ ] Go to a month with no transactions → zeros, no crash. Go to a future month → only
      pending/virtual recurrences counted as expected.
- [ ] Accounts list: tap an account → Transações opens filtered by that account.
- [ ] Cards list: tap a card → CreditCard screen for that card.
- [ ] Pendências (HomePendingTx): swipe right = accept (becomes confirmed, balance moves),
      swipe left = delete (disappears, balance unchanged).
- [ ] After saving a transaction with groups from the Home modal, the Home Grupos card and
      transaction dots refresh immediately without navigating away or reloading.
- [ ] Últimas transações (global list, not filtered by the selected month): no pending, no ignored, no future items; notes never show
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
- [ ] T11 Amount fields may use different currency input conventions (transaction modal vs
      partial invoice payment); check the displayed value before saving.
- [ ] T11b Validation: empty amount / zero / letters → blocked or sanitised, no crash.
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
- [ ] Extraction button (Transactions tab) without API key → "Chave API Ausente" alert.

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
- [ ] D7 Delete a paid debt → Acerto removed. Paid debts leave the unpaid list, so only
      mark this passed if you reached the paid debt through a real UI path.
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
- [ ] "+ Novo Ativo" create, edit, delete; "Patrimônio Acumulado" updates. (The list may be
      static and the button may have no handler; if so, report it as unavailable.)
- [ ] Long names truncate without cutting the value (use existing rows if creation is
      unavailable).

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
- [ ] Assistente IA: provider, model, API key saved (don't use real keys unless given).
- [ ] Comportamento Padrão: 30d / 90d / all → applied after restart.
- [ ] Backup: frequency, limit, Exportar JSON, Exportar CSV, Google Drive backup/restore
      (Android + credentials only), Zona de Perigo wipe → app returns to empty state.

## 11. Persistence
- [ ] Android: create data, force-stop/reopen → everything still there.
- [ ] Web: reload page → note whether data persists (only if the web build persists to localStorage).
- [ ] Settings (theme, module toggles, default period) persist after restart.

## 12. Grupos de transações
- [ ] Criar grupo de evento em Config → Grupos, com ícone, cor, datas e orçamento.
- [ ] Criar grupo contínuo em Config → Grupos, com meta mensal.
- [ ] Criar grupo pelo "+" da TransactionModal e auto-selecionar.
- [ ] Atribuir e editar grupos pelos chips da TransactionModal; remover atribuição.
- [ ] Long-press a real transaction (or use the header checkbox) to enter bulk selection;
      virtual/forecast rows are not selectable, swipe actions are disabled, and Add/Remove
      group preserves unrelated memberships.
- [ ] In Transações → filtros avançados, the Grupos chips filter real transactions and
      resets pagination.
- [ ] GroupTransactionPicker searches descriptions, paginates with "Carregar mais", excludes
      ignored/settlement rows, and assigns additively.
- [ ] GroupDetails → Regras supports rule CRUD, active toggles, keyword/category/account/
      amount/date criteria, and apply-to-existing preview; uncheck one preview row and verify
      only the remaining rows are assigned.
- [ ] A matching rule auto-assigns a newly created transaction and a materialized recurrence
      occurrence, but does not change groups when editing an existing transaction.
- [ ] Indicadores de grupo aparecem nas linhas de Transações e Home.
- [ ] GroupsScreen and GroupDetails show event budgets and ongoing monthly targets; verify an
      over-budget progress bar is red.
- [ ] GroupsScreen → compare opens a 2–4 group table and six-month chart; empty groups show
      zeros (never NaN/Infinity).
- [ ] GroupDetails mostra KPIs, evolução mensal, composição, ranking e top vilões.
- [ ] Remover da tela de detalhes remove apenas o vínculo, mantendo a transação.
- [ ] Editar transação a partir de GroupDetails salva normalmente.
- [ ] Card de Grupos na Home mostra os mais recentes e "Ver Tudo".
- [ ] Arquivar grupo; apagar grupo mantém todas as transações.
- [ ] Grupos de recorrência propagam para ocorrências materializadas.
- [ ] Exportação JSON inclui grupos; importação restaura grupos antigos e novos.
- [ ] Exportação JSON inclui `groupRules`; reset clears rules while retaining seeded groups.
- [ ] Pending occurrences remain listed in GroupDetails, but contribute 0 to KPI counts,
      totals and charts; ignored ("Excluído") occurrences disappear from the KPI, charts
      and transaction list.
- [ ] Reset on web/dev leaves only the two seeded demo groups and their seeded links;
      disposable groups and links are gone.
- [ ] Native replace restore: export JSON, open Config → Dispositivo → Restaurar Backup,
      choose the unmodified export in the system picker (copy it to emulator Downloads if
      needed), select replace restore, then fully relaunch and verify group names,
      transaction links, recurrence links and totals.
- [ ] Merge import and web restore have no visible UI path; mark untested rather than
      invoking repository helpers.
- [ ] Persistência verificada após reload web e reabertura Android.

## Fase 3 — Assistente IA
- Preconditions: configure uma chave em Config → Assistente IA, selecione Google Gemini
  e o modelo `gemini-3.5-flash`; nunca registre a chave em screenshots ou logs. Use o secret
  `GEMINI_API_KEY` por binding/substituição; não assuma formato/tamanho da chave.
- O free tier do `gemini-3.5-flash` é 20 req/min e os loops de tools estouram a cota
  ("Cota do Google Gemini excedida"). Registre o erro exato, marque o caso como untested
  nesse modelo e repita com `gemini-3.5-flash-lite`, anotando o modelo usado.
- Separe seleção semântica de mecânica de proposta: registre o resultado do chip padrão
  ("gastos de carro") e, se o modelo omitir transações ou atribuir a um grupo existente, use
  um prompt explícito com as descrições da fixture para provar Aplicar/Editar/Descartar.
- Android: teste o compositor COM o teclado aberto (multilinha + botão enviar visíveis);
  fechar o teclado antes de enviar esconde bugs de keyboard avoidance.
- Android: o campo mascarado da chave pode manter texto antigo; limpe com MOVE_END + DEL
  antes de digitar via adb e confira só o comprimento do texto mascarado (UIAutomator).
- [ ] Sem chave: Home → sparkles abre Assistente e mostra a orientação para configurar a
      chave, sem red screen.
- [ ] Perguntar "Quanto gastei este mês?" e comparar o total com Home.
- [ ] Perguntar um resumo filtrado por categoria e conferir os valores exibidos.
- [ ] Pedir "crie um grupo com meus gastos de combustível": a proposta lista as transações
      corretas; Aplicar cria o grupo e atribui os vínculos.
- [ ] Descartar uma proposta não grava nada; Editar altera o nome do grupo antes de aplicar.
- [ ] Propor uma regra e confirmar que ela aparece em GroupDetails → Regras.
- [ ] Erro do provedor aparece em uma bolha vermelha, sem travar a conversa.
- [ ] Repetir os fluxos na web e no Android; se a API estiver indisponível, marcar os casos
      dependentes como untested e registrar o motivo.

## Fase 4 — IA multimodal, configurações e memória
- [ ] Anexar uma imagem de recibo no Assistente. Gere uma fixture PNG simples com:
      `python -c "from PIL import Image,ImageDraw; im=Image.new('RGB',(900,300),'white'); ImageDraw.Draw(im).text((20,20),'PADARIA CENTRAL 12/03/2026 TOTAL R$ 23,50',fill='black'); im.save('/tmp/recibo.png')"`
      O cartão deve propor 1 transação com categoria e conta.
- [ ] Aplicar a proposta do recibo e confirmar a transação em Transações com categoria e conta.
- [ ] Anexar um PDF no web e confirmar que o documento é enviado ao Assistente.
- [ ] Pedir "Resumo do mês" e comparar receitas, despesas e saldo com os totais da Home.
- [ ] Pedir "Mude para o tema claro"; aplicar o cartão de configurações e confirmar a mudança imediata.
- [ ] Pedir "Esconda os cartões na Home"; aplicar a proposta e confirmar o módulo oculto.
- [ ] Dizer "sempre responda em tópicos"; verificar a linha "Lembrado" e o item em
      Config → Extração → Memória do assistente.
- [ ] Remover uma preferência e usar "Limpar tudo"; confirmar que a memória fica vazia.
- [ ] Descartar uma proposta de configurações e confirmar que tema, módulos e período não mudam.
- [ ] Confirmar persistência de propostas aplicadas, configurações e memória após reload web
      e reabertura Android.
- [ ] Repetir no web e Android; marcar dependências de provedor como untested se a API estiver
      indisponível. Aplicar as notas de cota do Fase 3.

Notas da Fase 4:
- A transação do recibo tem data histórica (12/03); em Transações mude o período avançado para
  "Sempre" antes de procurar, senão o filtro de 30/90 dias esconde a linha.
- Teste PNG e PDF pelo file picker real (no Android, `adb push` para `/sdcard/Download`).
  Descarte a proposta do segundo formato e confirme que continua 1 transação (sem duplicar).
- O "Resumo do mês" segue o cabeçalho da Home: inclui pendentes e acertos, exclui só ignoradas.
  Não confundir com GroupDetails, que exclui pendentes dos KPIs.
- Peça duas preferências diferentes para exercitar remoção individual vs. "Limpar tudo";
  reabra o app antes da remoção e depois do limpar para checar os dois estados.
- Câmera no emulador só valida permissão/captura/recorte/anexo/remoção (cena sintética).
  Não declare reconhecimento de recibo via câmera sem um recibo real.

## Fase 5 — Permissões, novas ferramentas, Markdown e consumo
- Preconditions: Config → Assistente IA (card "Assistente IA · Chave, permissões e consumo") com a chave Gemini e `gemini-3.5-flash-lite`. Reset do banco antes.
- [ ] Config → Assistente IA mostra: Provedor e chave, "O que o assistente pode fazer" (9 interruptores), "Consumo deste mês", preço do modelo, Memória.
- [ ] Padrões: Criar transações, Grupos e regras, Tema e configurações, Memória ligados; Editar, Apagar, Contas e categorias, Dívidas, Recorrências desligados. Persistem após reload/reabrir.
- [ ] Sem permissão: com "Apagar transações" desligado, pedir "Apague a transação X" → nenhum cartão; resposta cita Config → Assistente IA.
- [ ] Editar: ligar "Editar transações"; "Mude a categoria da transação X para Y" → cartão "Editar transações" com `#id desc: categoria → Y`; Aplicar → transação alterada na lista, saldos coerentes.
- [ ] Apagar: ligar "Apagar transações"; pedir para apagar uma transação → cartão vermelho "Apagar"; tocar → confirmação; Cancelar mantém; Apagar remove e atualiza saldo da Home.
- [ ] Contas e categorias: "Crie a categoria Pets" e "Crie um cartão Inter fecha dia 3 vence dia 10" → cartões; Aplicar → aparecem em Config.
- [ ] Dívidas: "Quanto me devem?" bate com Controle de Dívidas; "Marque a dívida de <nome> como paga" → cartão; Aplicar → dívida paga e Acerto criado na conta (igual ao fluxo manual). "Registre que o João me deve 30" → nova dívida avulsa.
- [ ] Recorrências: "Crie uma assinatura Netflix de 39,90 mensal" → cartão; Aplicar → recorrência e ocorrência aparecem.
- [ ] Saldos/faturas: "Qual o saldo das minhas contas e a fatura atual dos cartões?" → valores batem com Home/tela do cartão.
- [ ] Markdown: "Liste meus saldos em uma tabela markdown com negrito" → tabela e negrito renderizados (sem `**`, `|`, `###` literais), cores do tema; mensagens de erro continuam texto simples.
- [ ] Consumo: cada resposta mostra "N tokens"; cabeçalho mostra "Conversa: N tokens". Config → Consumo deste mês soma tokens e chamadas por modelo; Gemini mostra aviso de que não informa limite restante. Preencher preço (ex.: 0,1 / 0,4) → custo estimado aparece em Config e nas mensagens. "Zerar contador" zera.
- Not testable without keys: limites de rate limit de OpenAI/Claude (cabeçalhos) — registrar como não testado.
- Assertions extras:
  - Visite a aba Transações antes de aplicar mudanças no Assistente e volte sem reload: a aba já montada deve atualizar na hora.
  - Fatura do cartão via assistente deve bater com "Total da Fatura" da tela do cartão (inclui saldo anterior).
  - Compare Home e "Resumo do mês" antes e depois de criar uma recorrência pendente para hoje (Home inclui pendentes).
  - Markdown: teste tópicos, resposta curta e tabela de várias colunas; texto dentro do balão e rodapé de tokens abaixo, também com teclado aberto.
  - Preços: saia do campo antes de conferir o custo; vírgula decimal é aceita. "Zerar contador" mantém preços e memória.
  - O cartão de edição mostra só "campo → novo valor" (não mostra o valor antigo).
- Android: dependência nativa nova exige novo `npx expo run:android`. Feche o teclado antes de tocar em Aplicar (o primeiro toque pode só fechar o teclado). Se o Reload perder o bundle, refaça `adb reverse tcp:8081 tcp:8081` e abra o deep link do expo-development-client apontando para http://127.0.0.1:8081.

## 13. Cross-screen consistency (final check)
After all sections, for each account compare: Home account balance == sum of its
transactions (confirmed, not future) + initial balance == Transações filtered by that
account. Home debt totals == Debts screen totals. Card invoice totals == CreditCard screen.

## Secrets
- None needed for local accounts, transactions, debts, invoices or exports.
- `EXPO_PUBLIC_WEB_CLIENT_ID` is only needed for Google Sign-In; report a missing value
  separately from local results.

## Reporting
- Table of all case ids with passed / failed / untested (+ reason, e.g. "native only").
- For each failure: steps, expected vs actual, screenshot, suspected file.
- Known non-bugs: emulator-only notification-listener crash, Google Sign-In failing when
  `EXPO_PUBLIC_WEB_CLIENT_ID` is not set.
