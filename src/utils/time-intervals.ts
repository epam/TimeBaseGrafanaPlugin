import { TimeRange } from '@grafana/data';

const MIN_POINTS = 5;
const INTERVALS = [
  {
    value: 1,
    label: '1ms',
  },
  {
    value: 10,
    label: '10ms',
  },
  {
    value: 100,
    label: '100ms',
  },
  {
    value: 500,
    label: '500ms',
  },
  {
    value: 1000,
    label: '1s',
  },
  {
    value: 10 * 1000,
    label: '10s',
  },
  {
    value: 30 * 1000,
    label: '30s',
  },
  {
    value: 60 * 1000,
    label: '1m',
  },
  {
    value: 10 * 60 * 1000,
    label: '10m',
  },
  {
    value: 30 * 60 * 1000,
    label: '30m',
  },
  {
    value: 60 * 60 * 1000,
    label: '1h',
  },
  {
    value: 3 * 60 * 60 * 1000,
    label: '3h',
  },
  {
    value: 12 * 60 * 60 * 1000,
    label: '12h',
  },
  {
    value: 24 * 60 * 60 * 1000,
    label: '1d',
  },
  {
    value: 3 * 24 * 60 * 60 * 1000,
    label: '3d',
  },
  {
    value: 7 * 24 * 60 * 60 * 1000,
    label: '1w',
  },
  {
    value: 14 * 24 * 60 * 60 * 1000,
    label: '2w',
  },
  {
    value: 21 * 24 * 60 * 60 * 1000,
    label: '3w',
  },
  {
    value: 30 * 24 * 60 * 60 * 1000,
    label: '1M',
  },
  {
    value: 60 * 24 * 60 * 60 * 1000,
    label: '2M',
  },
  {
    value: 90 * 24 * 60 * 60 * 1000,
    label: '3M',
  },
];

export const SPECIAL_VALUES = [
  {
    value: Number.MIN_VALUE,
    label: 'NONE',
  },
  {
    value: NaN,
    label: 'MIN INTERVAL',
  },
];

export const getIntervals = (maxPoints: number, range: TimeRange) => {
  const value = range.to.diff(range.from);
  const minInterval = Math.trunc(value / maxPoints);
  const maxInterval = Math.trunc(value / MIN_POINTS);

  const result = [];
  for (const interval of INTERVALS) {
    if (interval.value > minInterval && interval.value < maxInterval) {
      result.push(interval);
    }
  }
  return [...SPECIAL_VALUES, ...result];
};
