import { describe, it, expect } from 'vitest';
import { PriceFormatPipe, NotionalFormatPipe, TimeFormatPipe } from './price-format.pipe';

describe('PriceFormatPipe', () => {
  const pipe = new PriceFormatPipe();

  it('formats treasury prices as handle + 32nds', () => {
    // 98.5 = handle 98, fraction 0.5 = 16/32
    const result = pipe.transform(98.5, 'treasury');
    expect(result).toBe('98-16');
  });

  it('formats decimal prices to 3dp by default', () => {
    expect(pipe.transform(99.456, 'other')).toBe('99.456');
  });

  it('formats decimal prices to custom decimal places', () => {
    expect(pipe.transform(99.456789, 'other', 2)).toBe('99.46');
  });

  it('returns -- for null value', () => {
    expect(pipe.transform(null as any, 'other')).toBe('--');
  });

  it('returns -- for NaN', () => {
    expect(pipe.transform(NaN, 'other')).toBe('--');
  });

  it('appends + for half-tick treasury prices', () => {
    // 98.515625 = 98 + 16.5/32, should show 98-16+
    const result = pipe.transform(98.515625, 'treasury');
    expect(result).toContain('+');
  });
});

describe('NotionalFormatPipe', () => {
  const pipe = new NotionalFormatPipe();

  it('formats millions', () => {
    expect(pipe.transform(100)).toBe('100M');
    expect(pipe.transform(25)).toBe('25M');
  });

  it('formats billions', () => {
    expect(pipe.transform(1000)).toBe('1.0B');
    expect(pipe.transform(2500)).toBe('2.5B');
  });

  it('formats sub-million as thousands', () => {
    expect(pipe.transform(0.5)).toBe('500K');
  });
});

describe('TimeFormatPipe', () => {
  const pipe = new TimeFormatPipe();

  it('returns a HH:MM:SS formatted string', () => {
    const ts = new Date('2024-01-01T14:30:45').getTime();
    const result = pipe.transform(ts);
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('produces a non-empty string for any valid timestamp', () => {
    expect(pipe.transform(Date.now()).length).toBeGreaterThan(0);
  });
});
