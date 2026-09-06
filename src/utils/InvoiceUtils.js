export const InvoiceUtils = {
  /**
   * Identifica em qual fatura uma transação pertence, baseado na data da transação e no dia de fechamento do cartão.
   * Retorna um identificador da fatura no formato "YYYY-MM" (que representa o mês de vencimento da fatura).
   */
  getInvoiceMonthForTransaction: (t, closingDay, dueDay) => {
    const transactionDateMs = typeof t === 'object' ? t.date : t;
    const type = typeof t === 'object' ? t.type : null;
    const note = typeof t === 'object' ? t.note : null;

    // A MÁGICA: Se a transação possui a tag explícita da fatura, ela SEMPRE pertence a essa fatura.
    // Isso permite que o usuário pague faturas atrasadas e o pagamento caia exatamente na fatura certa,
    // zerando o rollover e resolvendo o saldo passado.
    if (note && typeof note === 'string') {
      const match = note.match(/\[invoice:(\d{4}-\d{2})\]/);
      if (match) {
        return match[1];
      }
    }

    const date = new Date(transactionDateMs);
    const txDay = date.getDate();
    let invoiceMonth = date.getMonth(); // 0-11
    let invoiceYear = date.getFullYear();

    // Se a transação ocorreu no dia de fechamento ou depois, ela cai no próximo fechamento
    if (txDay >= closingDay) {
      invoiceMonth += 1;
    }

    // A regra de ouro do cartão de crédito: a "fatura" é definida pelo mês em que ela VENCE.
    if (dueDay && closingDay > dueDay) {
      invoiceMonth += 1;
    }

    // REGRA DE PAGAMENTOS: Pagamentos de fatura (income) costumam abater a fatura que acabou de fechar.
    // Ao atrasar o pagamento em 1 mês, garantimos que ele caia na fatura anterior na UI, 
    // fazendo o saldo dela zerar perfeitamente.
    if (type === 'income') {
      invoiceMonth -= 1;
    }

    while (invoiceMonth > 11) {
      invoiceMonth -= 12;
      invoiceYear += 1;
    }
    while (invoiceMonth < 0) {
      invoiceMonth += 12;
      invoiceYear -= 1;
    }

    return `${invoiceYear}-${String(invoiceMonth + 1).padStart(2, '0')}`;
  },

  /**
   * Agrupa transações de um cartão por fatura.
   */
  groupTransactionsByInvoice: (transactions, closingDay, dueDay) => {
    const invoices = {}; // key: "YYYY-MM", value: { total: number, transactions: [] }

    transactions.forEach(t => {
      const invoiceKey = InvoiceUtils.getInvoiceMonthForTransaction(t, closingDay, dueDay);
      if (!invoices[invoiceKey]) {
        invoices[invoiceKey] = {
          monthKey: invoiceKey,
          total: 0,
          cycleExpenses: 0,
          cyclePayments: 0,
          transactions: []
        };
      }
      
      invoices[invoiceKey].transactions.push(t);
      if (t.type === 'expense') {
        invoices[invoiceKey].cycleExpenses += t.amount;
      } else {
        invoices[invoiceKey].cyclePayments += t.amount;
      }
    });

    const sortedKeys = Object.keys(invoices).sort();
    
    // Passo 1: O pagamento cai na fatura onde foi feito (ou taggeado).
    // Se ele for MAIOR que as despesas do mês, o EXCESSO flui para TRÁS, para pagar a bola de neve!
    for (let i = sortedKeys.length - 1; i >= 0; i--) {
      const k = sortedKeys[i];
      const inv = invoices[k];
      
      if (inv.cyclePayments > inv.cycleExpenses) {
        const excess = inv.cyclePayments - inv.cycleExpenses;
        inv.cyclePayments = inv.cycleExpenses; // O mês atual absorve apenas o necessário para si
        
        if (i > 0) {
          // Joga o excesso para o mês anterior
          const prevKey = sortedKeys[i - 1];
          invoices[prevKey].cyclePayments += excess;
        } else {
          // Se for o primeiro mês e sobrou dinheiro, ele fica com o excesso (saldo credor)
          inv.cyclePayments += excess;
        }
      }
    }

    // Passo 2: Calcular a bola de neve normalmente (da frente para trás)
    let runningBalance = 0;

    return sortedKeys.map(k => {
      const inv = invoices[k];
      
      inv.previousBalance = runningBalance;
      
      const cycleNet = inv.cycleExpenses - inv.cyclePayments;
      inv.closingBalance = inv.previousBalance + cycleNet;
      
      inv.total = inv.closingBalance; 
      runningBalance = inv.closingBalance;
      
      return inv;
    });
  },

  /**
   * Retorna informações do ciclo atual baseado na data de hoje
   */
  getCurrentInvoiceCycle: (closingDay, dueDay) => {
    const today = new Date();
    const currentInvoiceKey = InvoiceUtils.getInvoiceMonthForTransaction(today.getTime(), closingDay, dueDay);
    
    return InvoiceUtils.getInvoiceCycleDates(currentInvoiceKey, closingDay, dueDay);
  },

  /**
   * Retorna as datas de início e fim de ciclo de uma fatura específica.
   * Útil para injetar transações dentro de um ciclo exato (ex: taxas e juros).
   */
  getInvoiceCycleDates: (monthKey, closingDay, dueDay) => {
    if (monthKey === 'N/A') return { cycleStart: Date.now(), cycleEnd: Date.now() };
    
    const [year, month] = monthKey.split('-').map(Number);
    let offset = (dueDay && closingDay > dueDay) ? 1 : 0;
    
    // Calcula os meses do ciclo.
    // 'month' é o mês da fatura (vencimento).
    // O fechamento acontece no mês (month - 1 - offset).
    let targetMonth = month - 1 - offset;
    let prevMonth = targetMonth - 1;
    let prevYear = year;
    let targetYear = year;

    while (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    while (prevMonth < 0) {
      prevMonth += 12;
      prevYear -= 1;
    }
    
    const cycleStart = new Date(prevYear, prevMonth, closingDay);
    const cycleEnd = new Date(targetYear, targetMonth, closingDay - 1, 23, 59, 59, 999);
    
    return {
      cycleStart: cycleStart.getTime(),
      cycleEnd: cycleEnd.getTime()
    };
  }
};
