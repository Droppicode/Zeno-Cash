export const LANGS = ['en', 'pt'];

export const COPY = {
  en: {
    htmlLang: 'en',
    title: 'Zeno Cash · Personal finance, offline-first',
    nav: { showcase: 'How it works', features: 'Features', ai: 'Assistant', privacy: 'Privacy', download: 'Download' },
    hero: {
      eyebrow: 'Personal finance · offline-first',
      title: ['Your money,', 'in order.'],
      lead: 'Accounts, cards, debts and groups in a lightweight app that keeps everything on your device, with an AI assistant that only changes what you approve.',
      apk: 'Download APK',
      web: 'Try on the web',
      code: 'Code on GitHub',
      chipDebt: 'Debt settled',
      chipAi: 'AI proposal',
    },
    marquee: 'Debts & Settlements · Groups · Invoices · Recurrences · AI Assistant · Receipt scanning · Themes · Backup · ',
    stats: ['offline-first', 'AI providers', 'servers in between', 'assistant tools'],
    showcase: {
      eyebrow: 'How it works',
      title: ['Scroll down.', 'The app follows.'],
      steps: [
        ['Home', 'Everything that matters, on one screen', 'Balance, accounts, cards, pending items and groups side by side. Monthly income and expenses match every screen in the app.'],
        ['Debts', 'Debts that settle themselves', 'Mark a debt as paid and the settlement lands in the right account or invoice. Unmark it and the settlement is gone. No phantom numbers on Home.'],
        ['Groups', 'Groups for trips, cars, projects', 'Collect transactions into “Alagoas Trip 2026” or “Fiesta Car” and see the total, budget, monthly and yearly averages. Automatic rules do the rest.'],
        ['Analytics', 'Analytics without filter overload', 'Monthly trend, category breakdown and spending heatmap. Every group gets its own analytics screen.'],
        ['Assistant', 'An AI that proposes, you decide', 'Ask a question, send a receipt or request a group. The assistant reads your data through tools and every change becomes a card you apply or discard.'],
      ],
    },
    features: {
      eyebrow: 'Features',
      title: ['Everything in place,', 'nothing extra.'],
      settingsAlt: 'Settings',
      items: [
        ['Debts & Settlements', 'Who owes you, who you owe, and the real balance of each account after paying.'],
        ['Many-to-many groups', 'A transaction can belong to several groups at once.'],
        ['Cards & invoices', 'Invoices per billing cycle, previous balance and invoice payment.'],
        ['Gemini, OpenAI or Claude', 'Pick the provider, the model and what the AI is allowed to do. Tokens and estimated cost in plain sight.'],
        ['Recurrences', 'Subscriptions and salaries posted automatically.'],
        ['Themes & modules', 'Create themes, adjust zoom and hide what you do not use.'],
        ['Backup & export', 'JSON, CSV and automatic backup to Google Drive or the device.'],
      ],
    },
    ai: {
      eyebrow: 'AI Assistant',
      title: ['Ask.', 'Review.', 'Apply.'],
      alt: ['Assistant', 'Transactions'],
      items: [
        ['Tool-based queries', 'Searches and summarizes transactions on demand, without sending your whole history with every question.'],
        ['Receipts & PDFs', 'Send a photo or a statement and get transactions ready to review.'],
        ['Per-area permissions', 'You choose what the AI can create, edit or delete. Deleting always asks for confirmation.'],
        ['Visible usage', 'Tokens per message, monthly total and estimated cost per model.'],
      ],
    },
    privacy: {
      eyebrow: 'Privacy',
      title: ['Your data stays', 'with you.'],
      items: [
        ['Works offline', 'Local SQLite database. No account, no login, no mandatory cloud.'],
        ['Key on the device', 'The AI key lives in the phone secure storage and calls go straight to the provider.'],
        ['Backup on your terms', 'Export JSON or CSV, or enable automatic backup to Drive.'],
      ],
    },
    cta: {
      title: ['Your finances,', 'under control.'],
      text: 'Free and open source. On Android or straight in the browser.',
      apk: 'Download APK',
      demo: 'Open demo',
    },
    footer: { demo: 'Web demo', note: 'Open source. React Native + Expo.' },
  },
  pt: {
    htmlLang: 'pt-BR',
    title: 'Zeno Cash · Finanças pessoais offline-first',
    nav: { showcase: 'Como funciona', features: 'Funções', ai: 'Assistente', privacy: 'Privacidade', download: 'Baixar' },
    hero: {
      eyebrow: 'Finanças pessoais · offline-first',
      title: ['Seu dinheiro,', 'em ordem.'],
      lead: 'Contas, cartões, dívidas e grupos em um app leve, que guarda tudo no seu aparelho e tem um assistente de IA que só mexe no que você aprovar.',
      apk: 'Baixar APK',
      web: 'Testar na web',
      code: 'Código no GitHub',
      chipDebt: 'Dívida quitada',
      chipAi: 'Proposta da IA',
    },
    marquee: 'Dívidas e Acertos · Grupos · Faturas · Recorrências · Assistente IA · Recibos por foto · Temas · Backup · ',
    stats: ['offline-first', 'provedores de IA', 'servidores no meio', 'ferramentas do assistente'],
    showcase: {
      eyebrow: 'Como funciona',
      title: ['Role a página.', 'O app acompanha.'],
      steps: [
        ['Home', 'Tudo o que importa, em uma tela', 'Saldo, contas, cartões, pendências e grupos lado a lado. Receitas e despesas do mês batem com cada tela do app.'],
        ['Dívidas', 'Dívidas que se resolvem sozinhas', 'Marque como paga e o Acerto entra na conta ou na fatura certa. Desmarcou? O acerto some. Sem números fantasmas na Home.'],
        ['Grupos', 'Grupos para viagens, carro, projetos', 'Junte transações em “Viagem Alagoas 2026” ou “Carro Fiesta” e veja total, orçamento, média mensal e anual. Regras automáticas fazem o resto.'],
        ['Análise', 'Análises sem excesso de filtros', 'Evolução mensal, composição por categoria e mapa de gastos. Cada grupo tem a própria tela de análise.'],
        ['Assistente', 'Uma IA que propõe, você decide', 'Pergunte, mande um recibo ou peça um grupo. O assistente consulta seus dados por ferramentas e toda alteração vira um cartão para aplicar ou descartar.'],
      ],
    },
    features: {
      eyebrow: 'Funções',
      title: ['Tudo no lugar,', 'nada sobrando.'],
      settingsAlt: 'Configurações',
      items: [
        ['Dívidas e Acertos', 'Quem te deve, quem você deve, e o saldo real de cada conta depois de pagar.'],
        ['Grupos N:N', 'Uma transação pode estar em vários grupos ao mesmo tempo.'],
        ['Cartões e faturas', 'Faturas por ciclo, saldo anterior e pagamento de fatura.'],
        ['Gemini, OpenAI ou Claude', 'Escolha o provedor, o modelo e o que a IA pode fazer. Tokens e custo estimado à vista.'],
        ['Recorrências', 'Assinaturas e salários lançados automaticamente.'],
        ['Temas e módulos', 'Crie temas, ajuste o zoom e esconda o que você não usa.'],
        ['Backup e exportação', 'JSON, CSV e backup automático no Google Drive ou no aparelho.'],
      ],
    },
    ai: {
      eyebrow: 'Assistente IA',
      title: ['Pergunte.', 'Revise.', 'Aplique.'],
      alt: ['Assistente', 'Transações'],
      items: [
        ['Consulta por ferramentas', 'Busca e resume transações sob demanda, sem mandar o histórico inteiro a cada pergunta.'],
        ['Recibos e PDFs', 'Mande uma foto ou um extrato e receba as transações prontas para revisar.'],
        ['Permissões por área', 'Você liga o que a IA pode criar, editar ou apagar. Apagar sempre pede confirmação.'],
        ['Consumo visível', 'Tokens por mensagem, total do mês e custo estimado por modelo.'],
      ],
    },
    privacy: {
      eyebrow: 'Privacidade',
      title: ['Seus dados ficam', 'com você.'],
      items: [
        ['Funciona offline', 'Banco SQLite local. Sem conta, sem login, sem nuvem obrigatória.'],
        ['Chave no aparelho', 'A chave da IA fica no armazenamento seguro do celular e as chamadas vão direto ao provedor.'],
        ['Backup quando quiser', 'Exporte JSON ou CSV, ou ative o backup automático no Drive.'],
      ],
    },
    cta: {
      title: ['Suas finanças,', 'sob controle.'],
      text: 'Grátis e de código aberto. No Android ou direto no navegador.',
      apk: 'Baixar APK',
      demo: 'Abrir demo',
    },
    footer: { demo: 'Demo web', note: 'Código aberto. React Native + Expo.' },
  },
};

export function initialLang() {
  try {
    const saved = localStorage.getItem('zeno-lang');
    if (LANGS.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return 'en';
}
