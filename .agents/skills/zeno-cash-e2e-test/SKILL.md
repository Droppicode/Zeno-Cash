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

### TransactionModal regression
- [ ] Run `/home/ubuntu/r8/transaction-modal-golden.cjs` on original and refactored code with a fresh web context; compare exported transaction, recurrence, debt, and group-link data. Cover expense, income, subscription, installment with interest, mixed split, edit, validation, and title auto-categorization; compare the four modal screenshots at the same viewport.

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
- [ ] Acertos hidden when Config → Módulos → Geral → "Esconder acertos de dívidas" is ON
      (default); visible when OFF. Same for Home recent list.
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
- [ ] Contas: long-press a card for 150 ms and drag it; open a new transaction and
      verify the first account is selected by default.
- [ ] Categorias: drag a card to a new position, open TransactionModal and verify the
      category chips follow the saved order.
- [ ] Grupos: drag a group card; verify its order persists after reload and is reflected
      on the Home groups card and in the group picker.
- [ ] Reload web or cold-start Android and verify the account and category orders persist;
      export a backup, restore it, and verify both orders again.
- [ ] Android drag: use `adb shell input draganddrop x1 y1 x2 y2 1500`, or a long-duration
      `swipe` if `draganddrop` is unavailable.
- [ ] Módulos: tabs Tela Inicial / Análise / Geral. Home and Análise tabs are one list per
      tab: each row has a drag handle, icon, name and switch (switch hides/shows the module,
      disabled rows dim but stay in the list). Hold and drag to reorder; "Padrão" appears once
      the order differs from the default and restores it. Default Home order: Contas, Cartões,
      Pendentes, Últimas, Dívidas, Limites por Macro, Grupos. Geral tab: Investimentos tab and
      hide Acertos. Verify each effect and that order/toggles persist after reload.
- [ ] Automações: notification listener toggle (Android only; web simulate via panel:
      Pix Nubank, Compra Itaú, Salário, Netflix cartão → transactions created and
      categorised).
- [ ] Assistente IA: provider, model, API key saved (don't use real keys unless given).
- [ ] Comportamento Padrão: 30d / 90d / all → applied after restart.
- [ ] Backup: frequency, limit, Exportar JSON, Exportar CSV, Google Drive backup/restore
- [ ] Web backup: exportar JSON, anotar totais da Home e quantidade de transações,
      adicionar duas transações, restaurar o arquivo exportado e confirmar a substituição;
      após reload e novo reload, conferir totais e contagem. Restaurar também o fixture JSON.
- [ ] Web rejeita arquivos `.db`/`.sqlite` com aviso claro; Google Drive e arquivos `.db`
      permanecem disponíveis apenas no app Android.
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
- [ ] Com `gemini-3.7-flash`, os campos de preço mostram os valores padrão e uma resposta
      exibe tokens, custo estimado e a nota sobre plano pago/gratuito do Gemini.
- [ ] Com um 429 Gemini simulado, aparece uma bolha de aviso distinta com ícone, mensagem do
      provedor, tempo de espera quando disponível e dica para trocar para um modelo mais leve;
      o consumo mensal não aumenta.
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
- [ ] Web: com "Lembrar chave neste navegador" desligado, a chave permanece após reload
      na aba atual, não aparece em `localStorage` e não existe em uma nova aba. Ao ligar,
      a chave passa para `localStorage` e fica disponível em uma nova aba. Limpar as chaves
      usadas no teste ao final; nunca registrar valores em capturas ou logs.
- Not testable without keys: limites de rate limit de OpenAI/Claude (cabeçalhos) — registrar como não testado.
- Assertions extras:
  - Visite a aba Transações antes de aplicar mudanças no Assistente e volte sem reload: a aba já montada deve atualizar na hora.
  - Fatura do cartão via assistente deve bater com "Total da Fatura" da tela do cartão (inclui saldo anterior).
  - Compare Home e "Resumo do mês" antes e depois de criar uma recorrência pendente para hoje (Home inclui pendentes).
  - Markdown: teste tópicos, resposta curta e tabela de várias colunas; texto dentro do balão e rodapé de tokens abaixo, também com teclado aberto.
  - Preços: saia do campo antes de conferir o custo; vírgula decimal é aceita. "Zerar contador" mantém preços e memória.
  - O cartão de edição mostra só "campo → novo valor" (não mostra o valor antigo).
- Android: dependência nativa nova exige novo `npx expo run:android`. Feche o teclado antes de tocar em Aplicar (o primeiro toque pode só fechar o teclado). Se o Reload perder o bundle, refaça `adb reverse tcp:8081 tcp:8081` e abra o deep link do expo-development-client apontando para http://127.0.0.1:8081.

## Notificações bancárias e sugestões com IA (Android release)
- Build: copie o `.env` (gitignored) para worktrees separadas antes do `expo prebuild`, senão o Client ID do Google some. Gere com APP_ENV/NODE_ENV=production e `assembleRelease -PreactNativeArchitectures=x86_64`; release não precisa de Metro. Confira o certificado antes de `adb install -r`.
- Disparo: `adb shell cmd notification post` sai de com.android.shell e é ignorado. Use APKs auxiliares descartáveis com pacotes tipo `com.santander.app`/`com.mercadopago.wallet` (receiver exportado + broadcast com title/text/bigText/titleBig em base64). Limpe as notificações antes de desinstalar os auxiliares.
- Config → Assistente IA define provider/chave; Config → Automações → "Sugestões com IA" liga/desliga. As notificações usam o modelo rápido do provider (ex. gemini-3.5-flash-lite), não o modelo do Assistente: confira no consumo.
- Casos: Santander "R$ 1.650,00." = 1650; borda tracejada girando + "IA lendo…" na Home e com a aba Transações já aberta (sem refocar), depois título/categoria da IA; editar e aprovar (ex. Aluguel/Moradia) e a próxima notificação parecida deve seguir esse estilo; toggle desligado = ai_status null; chave inválida = failed sem crash.
- Background: use Home do Android, não force-stop. Para headless frio, mate o PID; notificações postadas durante o rebind do listener podem se perder (limitação do Android), teste com um evento novo após o serviço voltar.
- Estados rápidos (~1-2 s): use um observador read-only do SQLite e screencap; a compressão do vídeo pode pular esses frames.
- Ao final, restaure os dados reais do usuário e confira saldos e zero pendentes.

### Cartão e fatura pelas notificações
- Prepare uma conta corrente com o nome do banco (ex. "Nubank") e um cartão (tipo crédito) com essa conta associada, fechamento e vencimento definidos.
- "Compra aprovada ... no cartão de crédito" deve criar a pendência no cartão e, ao aprovar, cair na fatura aberta do ciclo da data. "cartão de débito" e Pix ficam na conta corrente.
- "Pagamento da fatura de R$ X realizado" cria a pendência como despesa na conta corrente (título "Pagamento de Fatura"), sem a tag interna visível na nota. Ao aprovar (Home, Transações ou modal, com ou sem editar o valor), o app cria a entrada "Pagamento de Fatura" no cartão na fatura que já fechou e essa fatura zera/abaixa. Confira que não surgiu despesa duplicada e que a sugestão da IA não apaga o vínculo.
- Sem cartão cadastrado para o banco, tudo continua na conta corrente como antes.

### Recovering after host restart
- Reuse a release artifact only after checking the intended checkout and saved APK
  hash. Compare the installed `pm path` base.apk hash too; a version number alone
  does not identify the bundled JavaScript revision.
- Start the saved AVD without wiping data. Wait for ADB online, boot completion,
  package registration and Activity Manager readiness before opening scrcpy/app.
  Early `offline`, missing activity service or missing activity errors can reflect
  boot-time package scanning; check readiness before reinstalling or declaring loss.
- Verify persisted listener access, provider/model, backup file and financial rows.
  If interrupted after posting, restore the original through UI before recapturing
  the same exact input, avoiding residual pending rows and deduplication.
- Preserve the original private baseline rather than overwriting it with interrupted
  test data. After final restore, compare all fields and delete private snapshots.

### Fast-state evidence
- Keep parser/native-pending and AI-final assertions separate. Use actual native
  `ai_status=pending` to prove an amount was correct before enrichment.
- A frame immediately after row insertion may precede the asynchronous header
  render. Capture a later frame still showing the parser title/loading to prove
  the period total updates before the enriched UI, not only afterward.
- Review raw recording frames independently of automatic summaries. Automated
  compression can omit loading; select real-speed intervals from the same recording
  for the single recommended short video. Do not infer a visible category from an
  icon; use a modal or read-only row for category assertions.
- For repeated brand trials, vary only the amount and notification ID so the
  duplicate guard does not suppress later calls. Disclose this variation.

## Limites por macro
- Config → "Macros" card (also opened from the Home module's options icon or its empty hint). Each macro card has "Limite por mês (R$)", "Meta (%)" (used by Análise → composição macro), rename/remove, and the list of its categories. "Outros" is fixed and collects categories without a macro.
- The "Categorias" list on that screen shows each category with a macro pill; tapping cycles it through the macros (saved to `categories.macro`). Config → Categorias' editor offers the same macros. Renaming a macro moves its categories, limit and %; removing it moves its categories to Outros.
- Home: the "Limites por Macro" module lists only macros with a limit, in macro order. Bar is the macro color under 80%, amber with a warning icon from 80%, red with an alert icon from 100% ("R$ X acima"). With no limits it shows a hint that opens Config → Macros.
- Spending sums approved expenses of every category in the macro for the selected month(s). Pending and ignored transactions don't count, and a debt settlement ("Acerto") subtracts. With several months selected, the limit is multiplied by the number of months.
- Config → Módulos → Tela Inicial: the "Limites por Macro" switch hides/shows the module, and dragging reorders it. Both persist after reload. By default it sits right below Controle de Dívidas, also for saved orders from older versions that don't include it yet.
- Android: a transaction that pushes a macro past 80% and then 100% posts one local notification per threshold per month ("Essenciais chegou a 80% do limite" / "Limite de Essenciais estourado"). Disabling the Home module also disables the alerts.
- Limits are stored in the `macroBudgets` setting, so backup/restore keeps them.

## Web smoke tips
- Use a separate Expo port (`npm run web -- --port 8082`) to isolate the browser's SQL.js data from other sessions. Import synthetic fixtures through Config → Restaurar backup (JSON).
- For invoice opening tests, include a previous, current and future invoice; otherwise opening the last invoice by accident looks correct.
- Recurrence-only debt contracts may be hidden from Dívidas. Open them via Transações → filters → forecast +60D → projected transaction → Ver Detalhes do Contrato.

## Lembretes (Android)
- Config → Automações → "Lembretes" card (hidden on web): master switch, plus "Vencimento da fatura" (1/3/5d antes), "Recorrências do dia" and "Dívidas paradas" (15/30/60 dias). Settings persist after restart.
- Reminders are local notifications scheduled for 09:00 for the next 35 days. They are rebuilt on app start, when the app goes to background, in the daily background task and on every Lembretes setting change.
- Inspect what is scheduled with `adb shell dumpsys alarm | grep com.mmn.zenocash` or `adb shell dumpsys notification`. To see one fire, move the emulator clock (`adb shell su root date MMDDhhmmYYYY.ss`) to 08:59 on the target day, wait for 09:00, then restore automatic time.
- Expected: for a card with an open invoice (approved purchases only), "Fatura <cartão> vence em N dias" at due−N and "vence hoje" on the due date, both with the current amount. A fully paid invoice gets no reminder.
- Expected: active recurrences due on the same day are grouped into one "Hoje: …" notification. Paused recurrences don't appear.
- Expected: an open debt gets one "Dívida parada há N dias" reminder when it reaches N days. Debts already stale are summarized every Monday ("X dívidas paradas…"). Paid debts are excluded.
- Turning the master switch off cancels all scheduled reminders.

## Importar extrato OFX/CSV
- Transações → import button → "Importar Transações". It offers "Extrato OFX/CSV" (no AI key needed) or "Documento (IA)", which opens the old camera/PDF chooser and still requires a key. On web the multi-option alert is a `window.prompt` with numbered options.
- Fixture ideas: an OFX in SGML form (`OFXHEADER:100`, `<STMTTRN>` blocks without closing tags, Latin-1 accents), a credit card OFX (`<CCACCTFROM>`), a Nubank account CSV (`Data,Valor,Identificador,Descrição`), a Nubank card CSV (`date,title,amount`, where purchases are positive), and a `;` CSV with separate Crédito/Débito columns plus a "SALDO ANTERIOR" line.
- Expected review screen ("Revisar Importação"): it says how many lines came from the file and how many were skipped because the same day, amount and type already exist (matched one-to-one).
  - Below that are a "Conta do extrato" chip row (a credit card OFX/Nubank card CSV preselects the first credit card) and "Inverter entradas/saídas".
  - Descriptions that match an existing transaction reuse its category. Balance lines are not imported.
- After "Salvar Todas": transactions are approved (not pending) in the chosen account, group rules apply, and Home/account balances and invoices update. Importing the same file again skips everything.

## Bloqueio por PIN/biometria (Android only)
- Config → "Bloqueio do App" (hidden on web). Turning on "Bloquear com PIN" asks for a new 4–6 digit PIN twice; a mismatch goes back to step 1. The PIN and config live in SecureStore (`appLockPin`, `appLockConfig`), not in SQLite or backups.
- Expected:
  - A cold start shows "Zeno Cash bloqueado" with the keypad before any data.
  - Returning after ≥30s in background locks again; a short trip (<30s, e.g. the document picker) does not. Back does not dismiss the lock.
  - Wrong PIN shows "PIN incorreto". From the 5th wrong attempt it shows a 30s countdown, doubling each time up to 15 min, and this survives a restart.
- Biometrics on the emulator: enroll a fingerprint in Settings → Security, then `adb -e emu finger touch 1` while the prompt is up. "Desbloquear com biometria" only appears when hardware and enrollment exist, and turning it on requires a successful prompt. With it on, the prompt opens automatically on lock; "Usar PIN" falls back to the keypad.
- "Alterar PIN" asks for the current PIN, then the new one twice. Turning the switch off asks for the current PIN and removes the lock.

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

## Release APK identity and macro alert tips
- Select Node with `source ~/.nvm/nvm.sh`.
- Set **both** `APP_ENV=production` and `NODE_ENV=production` for prebuild and Gradle. APP_ENV controls applicationId; NODE_ENV alone still produces `com.mmn.zenocash.dev`.
- Before install, verify `aapt dump badging` reports `com.mmn.zenocash`, the expected version, and the expected signing digest. A successful `adb install -r` alone does not prove an upgrade of the production package.
- If switching variants leaves generated autolinking references to the previous namespace, regenerate ignored `android/build/generated/autolinking` and `android/app/build/generated/autolinking`, or clean the generated native project. Do not patch application source to resolve stale generated outputs.
- On launch verify a distinctive new UI element (for example Config → Macros) before recording.

### Macro fields and native alerts
- For controlled native inputs, prefer visible Ctrl+A replacement followed by the keyboard Done button or an explicit blur. Long rapid ADB Delete sequences can race React Native controlled-input updates; verify the displayed value before treating input as successful.
- Macro alerts run on transaction mutations. Changing a limit or only opening Home is not sufficient evidence of an alert check. Create a real expense or re-save an existing transaction through the UI.
- Record notification UUIDs before and after unchanged saves. Force-stop removes displayed notifications, so counts alone after a cold restart are not a valid dedupe comparison.
- To exercise a different month, preserve existing alert state, temporarily change the emulator clock, and save a transaction. Restore wall-clock time and `auto_time=1` afterward. Stored sent-key state retains only the checked month when a new alert is written.
- Native local backup: Config → Dispositivo → Fazer Backup Agora creates a checkpointed DB in app-private ZenoCashBackups. Transporting that generated backup to Download with ADB is sufficient for selecting it through the restore UI; do not substitute a hand-built DB for the export-under-test.

## Devin Secrets Needed
None for local macro fixtures, release build, or local notification tests. Preserve the existing `.env` privately if the release expects its public Google client ID.
