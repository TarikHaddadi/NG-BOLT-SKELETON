import { Injectable } from '@angular/core';
import { MatDateFormats, DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class AppDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: string): string {
    if (displayFormat === 'input') {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return super.format(date, displayFormat);
  }
}

/** Use 'input' so our adapter formats as yyyy-MM-dd */
export const APP_DATE_FORMATS: MatDateFormats = {
  parse:   { dateInput: 'yyyy-MM-dd' },
  display: {
    dateInput: 'input',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'yyyy-MM-dd',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

/** Convenience providers you can spread where needed */
export const APP_DATE_PROVIDERS = [
  { provide: DateAdapter, useClass: AppDateAdapter },
  { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS }
];