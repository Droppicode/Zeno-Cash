import { CurrencyUtils } from '../src/utils/currencyUtils';
import { DateUtils } from '../src/utils/dateUtils';

describe('CurrencyUtils', () => {
  it('formats text-input cents and Brazilian display values', () => {
    expect(CurrencyUtils.formatCurrency('123456')).toBe('1.234,56');
    expect(CurrencyUtils.formatDisplay(1234567.89)).toBe('1.234.567,89');
  });

  it('preserves negative values in display formatting and parsing', () => {
    expect(CurrencyUtils.formatDisplay(-1234.56)).toBe('-1.234,56');
    expect(CurrencyUtils.parseCurrency('-1.234,56')).toBe(-1234.56);
  });

  it('returns the documented empty and invalid-value defaults', () => {
    expect(CurrencyUtils.formatCurrency(null)).toBe('');
    expect(CurrencyUtils.formatDisplay(null)).toBe('0,00');
    expect(CurrencyUtils.parseCurrency('invalid')).toBe(0);
  });
});

describe('DateUtils', () => {
  afterEach(() => jest.useRealTimers());

  it('formats and parses Brazilian date input', () => {
    expect(DateUtils.formatDateInput('31122026')).toBe('31/12/2026');
    expect(DateUtils.parseDateInput('31/12/2026')).toBe(Date.UTC(2026, 11, 31));
    expect(DateUtils.parseDateInput('2026-12-31')).toBeNull();
  });

  it('limits date input to eight digits and returns null for the wrong length', () => {
    expect(DateUtils.formatDateInput('01022026123')).toBe('01/02/2026');
    expect(DateUtils.parseDateInput('1/2/2026')).toBeNull();
  });

  it('returns period start boundaries based on the current day', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-10T12:00:00Z'));

    expect(DateUtils.getLimitDateForPeriod('30d')).toBe(Date.UTC(2026, 3, 10));
    expect(DateUtils.getLimitDateForPeriod('90d')).toBe(Date.UTC(2026, 1, 9));
    expect(DateUtils.getLimitDateForPeriod('all')).toBe(0);
  });

  it('formats dates for Brazilian display', () => {
    expect(DateUtils.formatShortDate(Date.UTC(2026, 11, 31))).toBe('31/12/2026');
    expect(DateUtils.formatShortDate(null)).toBe('');
  });
});
