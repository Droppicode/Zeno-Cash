export const finite = value => (Number.isFinite(+value) ? +value : 0);

export const sanitizeSeries = series => (
  Array.isArray(series) ? series.map(item => ({ ...item, value: finite(item?.value) })) : []
);

export const lineScale = values => {
  const safeValues = (Array.isArray(values) ? values : []).map(finite);
  const maxVal = Math.max(...safeValues, 0);
  const minVal = Math.min(...safeValues, 0);
  const range = Math.max(maxVal - minVal, 1);
  const pad = range * 0.1;
  const yAxisOffset = Math.floor(minVal - pad);
  const maxValue = Math.max(1, Math.ceil(maxVal + pad - yAxisOffset));

  return { yAxisOffset, maxValue };
};

export const barMax = values => {
  const maxValue = Math.max(...(Array.isArray(values) ? values : []).map(finite), 0);
  if (maxValue <= 1) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  const scaledValue = maxValue / magnitude;
  const roundedValue = scaledValue <= 1 ? 1 : scaledValue <= 2 ? 2 : scaledValue <= 5 ? 5 : 10;

  return roundedValue * magnitude;
};

export const downsample = (series, maxPoints = 60) => {
  if (!Array.isArray(series)) return [];
  const limit = Number.isFinite(maxPoints) ? Math.max(2, Math.floor(maxPoints)) : 60;
  if (series.length <= limit) return series;

  return Array.from({ length: limit }, (_, index) => (
    series[Math.round(index * (series.length - 1) / (limit - 1))]
  ));
};

export const fitSpacing = (count, width) => {
  const points = Math.floor(finite(count));
  const availableWidth = Math.max(4, finite(width));
  return points <= 1 ? 4 : Math.max(4, (availableWidth - 40) / (points - 1));
};

export const limitDataPointLabels = (series, maxLabels = 8) => {
  if (!Array.isArray(series) || series.length === 0) return [];

  const labelCount = Math.min(series.length, Math.max(1, Math.floor(finite(maxLabels))));
  const lastLabelIndex = series.length > labelCount ? series.length - 4 : series.length - 1;
  const labeledIndices = new Set(Array.from({ length: labelCount }, (_, index) => (
    labelCount === 1 ? 0 : Math.round(index * lastLabelIndex / (labelCount - 1))
  )));

  return series.map((point, index) => ({
    ...point,
    dataPointText: labeledIndices.has(index) && point?.dataPointText != null
      ? formatCompactYLabel(point.dataPointText)
      : undefined
  }));
};

export const formatCompactYLabel = label => {
  const value = finite(label);
  const magnitude = Math.abs(value);
  const [divisor, suffix] = magnitude >= 1e9
    ? [1e9, 'B']
    : magnitude >= 1e6
      ? [1e6, 'M']
      : magnitude >= 1e3
        ? [1e3, 'k']
        : [1, ''];

  if (!suffix) return String(Math.round(value));
  return `${(value / divisor).toFixed(1).replace(/\.0$/, '')}${suffix}`;
};
