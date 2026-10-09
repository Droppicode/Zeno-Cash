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

        const occurrenceDate = new Date(currentDate);
        const matchesCalendarMonth = rec.frequencyType === 'monthly' || rec.frequencyType === 'yearly';
        const isPaid = txs.some(t => {
          if (!matchesCalendarMonth) return t.date === currentDate;

          const existingDate = new Date(t.date);
          return existingDate.getFullYear() === occurrenceDate.getFullYear()
            && existingDate.getMonth() === occurrenceDate.getMonth();
        });

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
        if (rec.frequencyType === 'monthly' || rec.frequencyType === 'yearly') {
          currentDate = this.occurrenceAt(rec.startDate, rec.frequencyType, rec.frequencyInterval, iteration + 1);
        } else {
          currentDate = this.addInterval(currentDate, rec.frequencyType, rec.frequencyInterval);
        }
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

  static occurrenceAt(startDate, type, interval, occurrenceIndex) {
    const d = new Date(startDate);
    if (type !== 'monthly' && type !== 'yearly') {
      return this.addInterval(startDate, type, interval * occurrenceIndex);
    }

    const anchorDay = d.getDate();

    d.setDate(1);
    if (type === 'monthly') {
      d.setMonth(d.getMonth() + (interval * occurrenceIndex));
    } else if (type === 'yearly') {
      d.setFullYear(d.getFullYear() + (interval * occurrenceIndex));
    }

    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(anchorDay, lastDay));
    return d.getTime();
  }
}
