import { Platform } from 'react-native';
import { expoDb } from './db';
import { TransactionRepository } from '../services/TransactionRepository';
import { InvoiceUtils } from '../utils/InvoiceUtils';

export const resetDatabase = async () => {
  if (Platform.OS === 'web') return true;
  try {
    expoDb.execSync(`
      DELETE FROM transactions;
      DELETE FROM debts;
      DELETE FROM recurrences;
      DELETE FROM monthly_balances;
      DELETE FROM accounts;
      DELETE FROM categories;
      
      -- Restaura conta padrão
      INSERT INTO accounts (name, type, balance, icon, color)
      VALUES ('Dinheiro', 'cash', 0, 'wallet-outline', '#4CAF50');
      
      -- Restaura categorias padrão
      INSERT INTO categories (name, icon, color, macro) VALUES
      ('Receitas', 'cash', '#4CAF50', 'Outros'),
      ('Transporte', 'car', '#FF9800', 'Essenciais'),
      ('Alimentação', 'restaurant', '#F44336', 'Essenciais'),
      ('Mercado', 'cart', '#2196F3', 'Essenciais'),
      ('Lazer & Assinaturas', 'play-circle', '#9C27B0', 'Estilo de Vida'),
      ('Saúde', 'medkit', '#E91E63', 'Essenciais');
    `);

    await TransactionRepository.initMonthlyBalances();
    return true;
  } catch (error) {
    console.error('Erro ao resetar banco de dados:', error);
    throw error;
  }
};

export const seedDatabase = async (force = false) => {
  if (!__DEV__ && !force) return;

  try {
    const existing = await expoDb.getAllAsync('SELECT id FROM transactions LIMIT 1');
    if (existing.length > 0 && !force) return; // Já possui dados e não é forçado

    console.log('Iniciando seed avançado do Zeno Cash...');

    // 1. Limpar banco para seed limpo
    expoDb.execSync(`
      DELETE FROM transactions;
      DELETE FROM debts;
      DELETE FROM recurrences;
      DELETE FROM monthly_balances;
      DELETE FROM accounts;
      DELETE FROM categories;
    `);

    const checkingData = [
      { name: 'Nubank', type: 'checking', balance: 2450.80, icon: 'card-outline', color: '#8A05BE' },
      { name: 'Carteira / Dinheiro', type: 'cash', balance: 220.00, icon: 'wallet-outline', color: '#4CAF50' }
    ];

    const accountIds = {};
    for (const acc of checkingData) {
      const res = await expoDb.runAsync(
        'INSERT INTO accounts (name, type, balance, icon, color) VALUES (?, ?, ?, ?, ?)',
        [acc.name, acc.type, acc.balance, acc.icon, acc.color]
      );
      accountIds[acc.name] = res.lastInsertRowId;
    }

    const creditData = [
      { name: 'Cartão Nubank Ultravioleta', type: 'credit', balance: 0, icon: 'card-outline', color: '#8A05BE', associatedAccountId: accountIds['Nubank'], closingDay: 25, dueDay: 5, creditLimit: 12000 }
    ];

    for (const acc of creditData) {
      const res = await expoDb.runAsync(
        'INSERT INTO accounts (name, type, balance, icon, color, associated_account_id, closing_day, due_day, credit_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [acc.name, acc.type, acc.balance, acc.icon, acc.color, acc.associatedAccountId, acc.closingDay, acc.dueDay, acc.creditLimit]
      );
      accountIds[acc.name] = res.lastInsertRowId;
    }

    // 3. Categorias com Macros estruturadas
    const categoriesData = [
      { name: 'Salário & Renda', icon: 'cash', color: '#4CAF50', macro: 'Outros' },
      { name: 'Alimentação & iFood', icon: 'restaurant', color: '#F44336', macro: 'Essenciais' },
      { name: 'Supermercado', icon: 'cart', color: '#2196F3', macro: 'Essenciais' },
      { name: 'Transporte & Combustível', icon: 'car', color: '#FF9800', macro: 'Essenciais' },
      { name: 'Moradia & Contas', icon: 'home', color: '#607D8B', macro: 'Essenciais' },
      { name: 'Lazer & Assinaturas', icon: 'play-circle', color: '#9C27B0', macro: 'Estilo de Vida' },
      { name: 'Saúde & Farmácia', icon: 'medkit', color: '#E91E63', macro: 'Essenciais' },
      { name: 'Educação & Cursos', icon: 'school', color: '#00BCD4', macro: 'Estilo de Vida' },
      { name: 'Investimentos & Aportes', icon: 'trending-up', color: '#FFD700', macro: 'Investimentos' }
    ];

    const categoryIds = {};
    for (const cat of categoriesData) {
      const res = await expoDb.runAsync(
        'INSERT INTO categories (name, icon, color, macro) VALUES (?, ?, ?, ?)',
        [cat.name, cat.icon, cat.color, cat.macro]
      );
      categoryIds[cat.name] = res.lastInsertRowId;
    }

    const now = new Date();

    // 4. Recorrências (Assinaturas e Parcelas) + Dívidas Globais (Rachas)
    const recList = [
      {
        description: 'Netflix Premium 4K',
        amount: 55.90,
        type: 'expense',
        categoryId: categoryIds['Lazer & Assinaturas'],
        accountId: accountIds['Cartão Nubank Ultravioleta'],
        monthsAgo: 5,
        dayOfMonth: 10,
        frequencyType: 'monthly',
        frequencyInterval: 1,
        installments: null,
        interestRate: 0,
        interestType: 'simple',
        splitDebts: [
          { personName: 'Lucas Ferreira', amount: 27.95, isPercentage: 1, ignoresInterest: 0 }
        ]
      },
      {
        description: 'Geladeira Frost Free Inox',
        amount: 320.00,
        type: 'expense',
        categoryId: categoryIds['Moradia & Contas'],
        accountId: accountIds['Cartão Nubank Ultravioleta'],
        monthsAgo: 5,
        dayOfMonth: 25,
        frequencyType: 'monthly',
        frequencyInterval: 1,
        installments: 8,
        interestRate: 1.5,
        interestType: 'simple',
        splitDebts: [
          { personName: 'Mariana Duarte', amount: 160.00, isPercentage: 1, ignoresInterest: 1 }
        ]
      }
    ];

    for (const rec of recList) {
      const { splitDebts, monthsAgo, dayOfMonth, ...recData } = rec;
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, dayOfMonth, 10, 0, 0).getTime();

      const recRes = await expoDb.runAsync(
        `INSERT INTO recurrences (
          description, amount, type, category_id, account_id,
          start_date, frequency_type, frequency_interval, installments,
          interest_rate, interest_type, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          recData.description,
          recData.amount,
          recData.type,
          recData.categoryId,
          recData.accountId,
          startDate,
          recData.frequencyType,
          recData.frequencyInterval,
          recData.installments,
          recData.interestRate,
          recData.interestType
        ]
      );
      const recId = recRes.lastInsertRowId;

      // Inserir template global de racha se houver
      if (splitDebts && splitDebts.length > 0) {
        for (const debt of splitDebts) {
          await expoDb.runAsync(
            `INSERT INTO debts (
              person_name, type, amount, date, account_id,
              recurrence_id, is_paid, is_percentage, ignores_interest, description
            ) VALUES (?, 'owed', ?, ?, ?, ?, 0, ?, ?, ?)`,
            [
              debt.personName,
              debt.amount,
              startDate,
              recData.accountId,
              recId,
              debt.isPercentage,
              debt.ignoresInterest,
              `Divisão: ${recData.description}`
            ]
          );
        }
      }

      // Materializar transações passadas dessa recorrência até o dia de hoje
      let iteration = 0;
      for (let m = monthsAgo; m >= 0; m--) {
        if (recData.installments && iteration >= recData.installments) break;

        const txDate = new Date(now.getFullYear(), now.getMonth() - m, dayOfMonth, 10, 0, 0);
        if (txDate.getTime() <= now.getTime()) {
          let baseAmount = recData.installments ? (recData.amount / recData.installments) : recData.amount;
          let finalAmount = baseAmount;
          if (recData.interestRate > 0) {
            if (recData.interestType === 'compound') {
              finalAmount = baseAmount * Math.pow(1 + (recData.interestRate / 100), iteration + 1);
            } else {
              finalAmount = baseAmount * (1 + ((recData.interestRate / 100) * (iteration + 1)));
            }
          }

          const isRecentMonth = m === 0;
          const txNote = recData.installments ? `Parcela ${iteration + 1}/${recData.installments}` : `Assinatura mensal`;

          const txRes = await expoDb.runAsync(
            `INSERT INTO transactions (amount, description, category_id, type, date, account_id, note, is_pending, is_ignored, recurrence_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [
              parseFloat(finalAmount.toFixed(2)),
              recData.description,
              recData.categoryId,
              recData.type,
              txDate.getTime(),
              recData.accountId,
              txNote,
              isRecentMonth ? 1 : 0, // O mês atual fica como pendente para aprovação
              recId
            ]
          );
          const newTxId = txRes.lastInsertRowId;

          // Se a recorrência tiver divisão de conta, cria o racha individual correspondente para essa transação
          if (splitDebts && splitDebts.length > 0) {
            for (const debt of splitDebts) {
              let debtAmount = debt.amount;
              if (debt.isPercentage) {
                debtAmount = finalAmount * (debt.amount / recData.amount);
              }
              const isPaid = m > 1 ? 1 : 0; // Meses mais antigos já estão pagos, mês recente pendente

              await expoDb.runAsync(
                `INSERT INTO debts (person_name, type, amount, date, account_id, transaction_id, recurrence_id, is_paid, is_percentage, ignores_interest, description)
                 VALUES (?, 'owed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  debt.personName,
                  parseFloat(debtAmount.toFixed(2)),
                  txDate.getTime(),
                  recData.accountId,
                  newTxId,
                  recId,
                  isPaid,
                  debt.isPercentage,
                  debt.ignoresInterest,
                  `Divisão ${recData.description} (${txNote})`
                ]
              );
            }
          }

          iteration++;
        }
      }
    }

    // 5. Gerar Histórico de Salários e Proventos dos últimos 4 meses
    const txsToInsert = [];

    // 5.1 Salários regulares todo dia 05
    for (let m = 4; m >= 0; m--) {
      const salaryDate = new Date(now.getFullYear(), now.getMonth() - m, 5, 10, 0, 0);
      if (salaryDate <= now) {
        txsToInsert.push({
          amount: 6850.00,
          description: 'Salário Mensal Tech Co.',
          type: 'income',
          categoryId: categoryIds['Salário & Renda'],
          accountId: accountIds['Nubank'],
          date: salaryDate.getTime(),
          note: 'Pagamento CLT + Bônus',
          isPending: 0
        });
      }

      // Rendimentos / Dividendos todo dia 15
      const divDate = new Date(now.getFullYear(), now.getMonth() - m, 15, 14, 30, 0);
      if (divDate <= now) {
        txsToInsert.push({
          amount: parseFloat((Math.random() * 120 + 180).toFixed(2)),
          description: 'Rendimento CDB & FIIs',
          type: 'income',
          categoryId: categoryIds['Investimentos & Aportes'],
          accountId: accountIds['Nubank'],
          date: divDate.getTime(),
          note: 'Proventos automáticos',
          isPending: 0
        });
      }
    }

    // 5.2 Despesas cotidianas variadas
    const sampleExpenses = [
      { desc: 'iFood - Hambúrguer Artesanal', cat: 'Alimentação & iFood', acc: 'Cartão Nubank Ultravioleta', min: 45, max: 95 },
      { desc: 'Posto Shell Gasolina Comum', cat: 'Transporte & Combustível', acc: 'Nubank', min: 120, max: 260 },
      { desc: 'Uber Viagem Cidade', cat: 'Transporte & Combustível', acc: 'Cartão Nubank Ultravioleta', min: 18, max: 48 },
      { desc: 'Almoço Restaurante Por Quilo', cat: 'Alimentação & iFood', acc: 'Carteira / Dinheiro', min: 32, max: 58 },
      { desc: 'Cinema Kinoplex + Pipoca', cat: 'Lazer & Assinaturas', acc: 'Cartão Nubank Ultravioleta', min: 65, max: 110 },
      { desc: 'Padaria Café da Manhã', cat: 'Alimentação & iFood', acc: 'Carteira / Dinheiro', min: 12, max: 35 },
      { desc: 'Compra Amazon', cat: 'Supermercado', acc: 'Cartão Nubank Ultravioleta', min: 80, max: 400 },
      { desc: 'Restaurante Fino', cat: 'Alimentação & iFood', acc: 'Cartão Nubank Ultravioleta', min: 200, max: 600 }
    ];

    // Gerar 20 transações avulsas nos últimos 90 dias
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const txDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (Math.random() * 12 * 60 * 60 * 1000));
      const template = sampleExpenses[Math.floor(Math.random() * sampleExpenses.length)];
      const amount = parseFloat((Math.random() * (template.max - template.min) + template.min).toFixed(2));

      txsToInsert.push({
        amount,
        description: template.desc,
        type: 'expense',
        categoryId: categoryIds[template.cat],
        accountId: accountIds[template.acc],
        date: txDate.getTime(),
        note: '',
        isPending: 0
      });
    }

    // Inserir todas as transações avulsas
    for (const tx of txsToInsert) {
      await expoDb.runAsync(
        `INSERT INTO transactions (amount, description, category_id, type, date, account_id, note, is_pending, is_ignored)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [tx.amount, tx.description, tx.categoryId, tx.type, tx.date, tx.accountId, tx.note, tx.isPending]
      );
    }

    // 5.3 Simular pagamento de faturas de cartão no passado
    // Calcular o saldo real usando InvoiceUtils para ser matemático e perfeito
    const allTxsForCards = await expoDb.getAllAsync(
      `SELECT * FROM transactions WHERE account_id IN (?)`
      , [accountIds['Cartão Nubank Ultravioleta']]
    );
    
    const formattedTxs = allTxsForCards.map(t => ({
      ...t, accountId: t.account_id, categoryId: t.category_id
    }));

    for (const cardName of ['Cartão Nubank Ultravioleta']) {
      const cardId = accountIds[cardName];
      const cardTxs = formattedTxs.filter(t => t.accountId === cardId);
      
      const cardDueDay = 5;
      const cardClosingDay = 25;
      const assocAcc = 'Nubank';
      
      const invoices = InvoiceUtils.groupTransactionsByInvoice(cardTxs, cardClosingDay, cardDueDay);
      
      let runningDebt = 0;
      for (const inv of invoices) {
        const [y, mStr] = inv.monthKey.split('-');
        let invoiceMonth = parseInt(mStr) - 1; // 0-11
        let invoiceYear = parseInt(y);
        
        const paymentDate = new Date(invoiceYear, invoiceMonth, cardDueDay, 10, 0, 0);
        
        // Apenas processa faturas cujo vencimento já passou
        if (paymentDate <= now) {
          const currentExpenses = inv.cycleExpenses; 
          const totalDue = runningDebt + currentExpenses;
          
          let amt = totalDue; // Paga total por padrão
          
          const monthsAgo = (now.getFullYear() - invoiceYear) * 12 + (now.getMonth() - invoiceMonth);
          
          // Nos últimos 3 meses, paga apenas 50% para vermos o saldo acumular (Rollover)
          if (monthsAgo <= 3) {
            amt = parseFloat((totalDue * 0.5).toFixed(2));
          }
          
          if (amt > 0) {
            await expoDb.runAsync(
              `INSERT INTO transactions (amount, description, category_id, type, date, account_id, note, is_pending, is_ignored)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
              [amt, `Pagamento Fatura ${cardName}`, categoryIds['Moradia & Contas'], 'expense', paymentDate.getTime(), accountIds[assocAcc], '']
            );
            await expoDb.runAsync(
              `INSERT INTO transactions (amount, description, category_id, type, date, account_id, note, is_pending, is_ignored)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
              [amt, `Pagamento de Fatura`, categoryIds['Moradia & Contas'], 'income', paymentDate.getTime(), cardId, '']
            );
            runningDebt = totalDue - amt;
          } else {
            runningDebt = totalDue;
          }
        }
      }
    }

    // 6. Transação com Racha de Amigos
    const rachaDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).getTime();
    const rachaRes = await expoDb.runAsync(
      `INSERT INTO transactions (amount, description, category_id, type, date, account_id, note, is_pending, is_ignored)
       VALUES (360.00, 'Churrasco de Aniversário', ?, 'expense', ?, ?, 'Carnes e bebidas', 0, 0)`,
      [categoryIds['Alimentação & iFood'], rachaDate, accountIds['Cartão Nubank Ultravioleta']]
    );
    const rachaTxId = rachaRes.lastInsertRowId;

    await expoDb.runAsync(
      `INSERT INTO debts (person_name, type, amount, date, account_id, transaction_id, is_paid, is_percentage, ignores_interest, description)
       VALUES 
       ('Pedro Henrique', 'owed', 90.00, ?, ?, ?, 1, 0, 0, 'Churrasco aniversário'),
       ('Ana Clara', 'owed', 90.00, ?, ?, ?, 0, 0, 0, 'Churrasco aniversário'),
       ('Carlos Eduardo', 'owed', 90.00, ?, ?, ?, 0, 0, 0, 'Churrasco aniversário')`,
      [
        rachaDate, accountIds['Cartão Nubank Ultravioleta'], rachaTxId,
        rachaDate, accountIds['Cartão Nubank Ultravioleta'], rachaTxId,
        rachaDate, accountIds['Cartão Nubank Ultravioleta'], rachaTxId
      ]
    );

    // 7. Dívidas Avulsas (Quem me deve / Eu Devo)
    const debtsAvulsos = [
      { person: 'Gabriel Santos', type: 'owed', amount: 350.00, daysAgo: 12, isPaid: 0, desc: 'Empréstimo compra de passagem' },
      { person: 'Beatriz Martins', type: 'owed', amount: 85.50, daysAgo: 3, isPaid: 0, desc: 'Ingresso Cinema 3D IMAX' },
      { person: 'Matheus Costa', type: 'owe', amount: 220.00, daysAgo: 18, isPaid: 0, desc: 'Festa de formatura' },
      { person: 'Rodrigo Alves', type: 'owed', amount: 60.00, daysAgo: 45, isPaid: 1, desc: 'Gasolina praia final de semana' }
    ];

    for (const d of debtsAvulsos) {
      const dDate = new Date(now.getTime() - d.daysAgo * 24 * 60 * 60 * 1000).getTime();
      await expoDb.runAsync(
        `INSERT INTO debts (person_name, type, amount, date, account_id, is_paid, is_percentage, ignores_interest, description)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
        [d.person, d.type, d.amount, dDate, accountIds['Nubank'], d.isPaid, d.desc]
      );
    }

    // 8. Recalcular Todos os Balanços Mensais
    await TransactionRepository.initMonthlyBalances();

    console.log('Seed completo gerado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao executar seedDatabase:', error);
    throw error;
  }
};
