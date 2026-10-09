import { barMax, downsample, finite, fitSpacing, formatCompactYLabel, limitDataPointLabels, lineScale, sanitizeSeries } from '../src/utils/chartSafety';

describe('chart safety helpers', () => {
  it('scales negative-only and single-point series with finite bounds', () => {
    expect(lineScale([-25])).toEqual({ yAxisOffset: -28, maxValue: 31 });
    expect(lineScale([-10, -5])).toEqual({ yAxisOffset: -11, maxValue: 12 });
    expect(barMax([-10, -5])).toBe(1);
  });

  it('gives all-zero data a usable scale and minimum spacing', () => {
    expect(lineScale([0, 0])).toEqual({ yAxisOffset: -1, maxValue: 2 });
    expect(barMax([0, 0])).toBe(1);
    expect(fitSpacing(2, 20)).toBe(4);
  });

  it('sanitizes NaN, Infinity, and missing values', () => {
    expect([NaN, Infinity, -Infinity, undefined].map(finite)).toEqual([0, 0, 0, 0]);
    expect(sanitizeSeries([{ value: NaN, label: 'a' }, { label: 'b' }])).toEqual([
      { value: 0, label: 'a' },
      { value: 0, label: 'b' }
    ]);
    expect(lineScale([NaN, Infinity])).toEqual({ yAxisOffset: -1, maxValue: 2 });
  });

  it('rounds large bar scales up and formats large axis values compactly', () => {
    expect(barMax([1e9])).toBe(1e9);
    expect(barMax([1_250])).toBe(2_000);
    expect(formatCompactYLabel(1_200)).toBe('1.2k');
    expect(formatCompactYLabel(3_400_000)).toBe('3.4M');
    expect(formatCompactYLabel(1e9)).toBe('1B');
  });

  it('downsamples evenly while retaining the first and last points', () => {
    const series = Array.from({ length: 365 }, (_, index) => ({ value: index, label: `${index}` }));
    const sampled = downsample(series);

    expect(sampled).toHaveLength(60);
    expect(sampled[0]).toBe(series[0]);
    expect(sampled[sampled.length - 1]).toBe(series[364]);
    expect(sampled.every((point, index) => index === 0 || point.value > sampled[index - 1].value)).toBe(true);
  });

  it('limits dense point labels and compacts extreme values', () => {
    const series = Array.from({ length: 60 }, (_, index) => ({
      value: index,
      dataPointText: index === 0 ? '-1000000000' : `${index}`
    }));
    const labeled = limitDataPointLabels(series);
    const visibleLabels = labeled.filter(point => point.dataPointText !== undefined);

    expect(visibleLabels).toHaveLength(8);
    expect(visibleLabels[0].dataPointText).toBe('-1B');
    expect(visibleLabels[visibleLabels.length - 1].dataPointText).toBe('56');
    expect(labeled[labeled.length - 1].dataPointText).toBeUndefined();
  });

  it('fits spacing to the available width and supports a single point', () => {
    expect(fitSpacing(60, 320)).toBeCloseTo(280 / 59);
    expect(fitSpacing(1, 320)).toBe(4);
  });
});
