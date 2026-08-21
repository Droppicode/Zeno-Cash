import { DateUtils } from '../utils/dateUtils';

export class RecurrenceGenerator {
  
  static generateVirtualTransactions(recurrences, existingTransactions, maxDate) {
    const virtuals = [];

    recurrences.forEach(rec => {
      if (!rec.isActive) return;

      const txs = existingTransactions.filter(t => t.recurrenceId === rec.id);
      
      let currentDate = rec.startDate;
      let iteration = 0;

      while (currentDate <= maxDate) {
        if (rec.installments && iteration >= rec.installments) break;

        // Check if there's already a real transaction for this iteration
        // A simple match: for monthly, same month/year. For others, exact match or within a small window.
        // To be safe, we can match by checking if any real tx is within a 15-day window of the expected date
        // or just rely on 'iteration' if we add an 'iteration' column to transactions later.
        // For MVP: check if any real tx has the exact same date (since it was materialized from virtual)
        const isPaid = txs.some(t => t.iteration === iteration || t.date === currentDate);

        if (!isPaid) {
          // Calculate interest if applicable
          let baseAmount = rec.installments ? (rec.amount / rec.installments) : rec.amount;
          let finalAmount = baseAmount;
          
          if (rec.interestRate > 0) {
             if (rec.interestType === 'compound') {
               finalAmount = baseAmount * Math.pow(1 + (rec.interestRate / 100), iteration + 1);
             } else {
               // simple
               finalAmount = baseAmount * (1 + ((rec.interestRate / 100) * (iteration + 1)));
             }
          }

          virtuals.push({
            id: `virtual_${rec.id}_${iteration}`,
            amount: finalAmount,
            description: rec.description,
            categoryId: rec.categoryId,
            type: rec.type,
            date: currentDate,
            accountId: rec.accountId,
            note: rec.installments ? `Parcela ${iteration + 1}/${rec.installments}` : `Assinatura`,
            isPending: 1,
            isVirtual: true,
            recurrenceId: rec.id,
            iteration: iteration
          });
        }

        // Advance date
        currentDate = this.addInterval(currentDate, rec.frequencyType, rec.frequencyInterval);
        iteration++;
      }
    });

    return virtuals;
  }

  static addInterval(timestamp, type, interval) {
    const d = new Date(timestamp);
    if (type === 'custom_days') {
      d.setDate(d.getDate() + interval);
    } else if (type === 'monthly') {
      const originalDay = d.getDate();
      d.setMonth(d.getMonth() + interval);
      if (d.getDate() !== originalDay) {
        d.setDate(0);
      }
    } else if (type === 'yearly') {
      d.setFullYear(d.getFullYear() + interval);
    }
    return d.getTime();
  }
}
