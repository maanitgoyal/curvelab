import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'priceFormat', standalone: true })
export class PriceFormatPipe implements PipeTransform {
  transform(value: number, type: 'treasury' | 'other' = 'other', decimals = 3): string {
    if (value == null || isNaN(value)) return '--';

    if (type === 'treasury') {
      // Display as handle + 32nds (e.g., 98-23+)
      const handle = Math.floor(value);
      const fraction = value - handle;
      const thirtySeconds = Math.round(fraction * 32 * 10) / 10;
      const whole32 = Math.floor(thirtySeconds);
      const half = thirtySeconds - whole32 >= 0.5 ? '+' : '';
      return `${handle}-${String(whole32).padStart(2, '0')}${half}`;
    }

    return value.toFixed(decimals);
  }
}

@Pipe({ name: 'notionalFormat', standalone: true })
export class NotionalFormatPipe implements PipeTransform {
  transform(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}B`;
    if (value >= 1) return `${value}M`;
    return `${value * 1000}K`;
  }
}

@Pipe({ name: 'timeFormat', standalone: true })
export class TimeFormatPipe implements PipeTransform {
  transform(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
