import { db } from './db';
import { transactions } from './schema';
import { categorizeTransaction } from '../services/categorizer';

export const seedDatabase = async () => {
  try {
    const existing = await db.select().from(transactions);
    if (existing.length > 50) return; // Já tem bastante dado, não recriar

    console.log('Populando banco com transações mock...');
    const mocks = [];
    const now = new Date();
    
    // Tipos de gastos que dão match no categorizador
    const expenses = ['Uber', 'Ifood', 'Atacadão', 'Netflix', 'Drogasil', 'Padaria', 'Posto', 'Cinema'];
    const incomes = ['Salário', 'Pix recebido'];
    
    // Gerar 200 transações espalhadas em até 1 ano e meio atrás
    for (let i = 0; i < 200; i++) {
      // Data aleatória entre hoje e 500 dias atrás
      const randomDaysAgo = Math.floor(Math.random() * 500);
      const date = new Date(now.getTime() - (randomDaysAgo * 24 * 60 * 60 * 1000));
      
      const isIncome = Math.random() > 0.85; // 15% de chance de ser receita
      const desc = isIncome ? incomes[Math.floor(Math.random() * incomes.length)] : expenses[Math.floor(Math.random() * expenses.length)];
      
      let amount = 0;
      if (isIncome) {
        amount = Math.random() * 4000 + 2000; // Receitas entre 2k e 6k
      } else {
        amount = Math.random() * 150 + 10; // Despesas entre 10 e 160
      }
      
      const catInfo = categorizeTransaction(desc, amount);
      
      mocks.push({
        amount: parseFloat(amount.toFixed(2)),
        description: desc,
        type: catInfo.type,
        date: date.getTime(),
      });
    }
    
    // Inserir no banco
    for (const mock of mocks) {
      await db.insert(transactions).values(mock);
    }
    console.log('200 Mocks gerados com sucesso!');
  } catch (error) {
    console.log('Erro no seed', error);
  }
};
