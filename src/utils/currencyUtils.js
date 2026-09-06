export const CurrencyUtils = {
  /**
   * Formats a number or string into currency format (e.g., 1.234,56).
   * Strips all non-digit characters, treating the number as cents.
   * This naturally causes the input to be filled from right to left.
   */
  formatCurrency: (value) => {
    if (value === undefined || value === null) return '';
    const cleaned = value.toString().replace(/\D/g, '');
    if (!cleaned) return '';
    const numberValue = parseInt(cleaned, 10);
    const formatted = (numberValue / 100).toFixed(2);
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
  },

  /**
   * Parses a formatted currency string (e.g., 1.234,56) back into a float (e.g., 1234.56).
   */
  parseCurrency: (value) => {
    if (!value) return 0;
    const raw = value.toString().replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? 0 : parsed;
  }
};
