export const InvoiceUtils = {
  /**
   * Identifica em qual fatura uma transação pertence, baseado na data da transação e no dia de fechamento do cartão.
   * Retorna um identificador da fatura no formato "YYYY-MM" (que representa o mês de vencimento da fatura).
   */
  getInvoiceMonthForTransaction: (transactionDateMs, closingDay) => {
    const date = new Date(transactionDateMs);
    const txDay = date.getDate();
    let invoiceMonth = date.getMonth(); // 0-11
    let invoiceYear = date.getFullYear();

    // Se a transação ocorreu no dia de fechamento ou depois, ela cai na fatura do PRÓXIMO mês
    if (txDay >= closingDay) {
      invoiceMonth += 1;
      if (invoiceMonth > 11) {
        invoiceMonth = 0;
        invoiceYear += 1;
      }
    }

    return `${invoiceYear}-${String(invoiceMonth + 1).padStart(2, '0')}`;
  },

  /**
   * Agrupa transações de um cartão por fatura.
   */
  groupTransactionsByInvoice: (transactions, closingDay) => {
    const invoices = {}; // key: "YYYY-MM", value: { total: number, transactions: [] }

    transactions.forEach(t => {
      const invoiceKey = InvoiceUtils.getInvoiceMonthForTransaction(t.date, closingDay);
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
      // Para cartões, "expense" aumenta a dívida.
      // "income" (pagamento da fatura) reduz a dívida.
      if (t.type === 'expense') {
        invoices[invoiceKey].cycleExpenses += t.amount;
      } else {
        invoices[invoiceKey].cyclePayments += t.amount;
      }
    });

    // Ordena as chaves
    const sortedKeys = Object.keys(invoices).sort();
    let runningBalance = 0;

    return sortedKeys.map(k => {
      const inv = invoices[k];
      inv.previousBalance = runningBalance;
      
      const cycleNet = inv.cycleExpenses - inv.cyclePayments;
      inv.closingBalance = inv.previousBalance + cycleNet;
      
      // Mantém 'total' para retrocompatibilidade, mas representa o saldo final real da fatura
      inv.total = inv.closingBalance; 
      
      runningBalance = inv.closingBalance;
      
      return inv;
    });
  },

  /**
   * Retorna informações do ciclo atual baseado na data de hoje
   */
  getCurrentInvoiceCycle: (closingDay) => {
    const today = new Date();
    const currentInvoiceKey = InvoiceUtils.getInvoiceMonthForTransaction(today.getTime(), closingDay);
    
    // Calcula datas do ciclo
    const [year, month] = currentInvoiceKey.split('-').map(Number);
    // Mês da fatura é 'month' (1-12). O fechamento ocorreu no mês anterior no dia 'closingDay'.
    let prevMonth = month - 2; // -1 for JS 0-index, -1 for previous month
    let prevYear = year;
    if (prevMonth < 0) {
      prevMonth += 12;
      prevYear -= 1;
    }
    
    const cycleStart = new Date(prevYear, prevMonth, closingDay);
    const cycleEnd = new Date(year, month - 1, closingDay - 1, 23, 59, 59, 999);
    
    return {
      currentInvoiceKey,
      cycleStart: cycleStart.getTime(),
      cycleEnd: cycleEnd.getTime()
    };
  }
};
