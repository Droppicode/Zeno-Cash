export const DateUtils = {
  getLimitDateForPeriod: (periodKey) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    let limitDate = new Date(0);
    
    if (periodKey === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      limitDate = d;
    } else if (periodKey === '90d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      d.setHours(0, 0, 0, 0);
      limitDate = d;
    }
    
    return limitDate.getTime();
  },

  parseDateInput: (dateStr) => {
    if (dateStr.length !== 10) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
  },
  
  formatDateInput: (text) => {
    let v = text.replace(/\D/g, '').slice(0, 8);
    if (v.length >= 5) return `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
    if (v.length >= 3) return `${v.slice(0,2)}/${v.slice(2)}`;
    return v;
  }
};
