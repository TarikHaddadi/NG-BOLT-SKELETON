import { Component, Input, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateAdapter, MAT_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import { FieldConfig } from '@core/interfaces';

@Component({
  selector: 'app-datepicker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatIconModule, TranslateModule],
  template: `
    <mat-form-field appearance="outline" class="w-full" floatLabel="always">
      <mat-label>{{ field.label | translate }}</mat-label>

      <input
        #raw
        matInput
        [matDatepicker]="picker"
        [formControl]="control"
        [placeholder]="field.placeholder || ''"
        [attr.pattern]="field.pattern"    
        inputmode="numeric"
        maxlength="10"
        (input)="onRawInput(raw.value)"     
        (blur)="control.markAsTouched()"
        [attr.aria-describedby]="hintId"
        [attr.aria-invalid]="control.invalid || null"
        [attr.aria-required]="field.required || null"
      />

      <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
      <mat-datepicker #picker></mat-datepicker>

      <mat-hint *ngIf="field.helperText && !showError" [id]="hintId">
        {{ field.helperText | translate }}
      </mat-hint>

      <mat-error *ngIf="showError" role="alert">
        {{ firstErrorMessage() }}
      </mat-error>
    </mat-form-field>
  `,
  styleUrls:["./datepicker.component.scss"]
})
export class DatepickerComponent {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) control!: FormControl<Date | null>;
  @ViewChild('raw', { static: true }) rawInput!: ElementRef<HTMLInputElement>;

  private lastText = '';

  constructor(
    private t: TranslateService,
    private dateAdapter: DateAdapter<Date>,
    @Inject(MAT_DATE_FORMATS) private dateFormats: MatDateFormats
  ) {}

  get showError() { return !!(this.control?.touched && this.control?.invalid); }
  get hintId() { return `${this.field.name}-hint`; }

  /** Capture raw text and set/clear a 'format' error based on placeholder pattern */
  onRawInput(text: string) {
    this.lastText = text ?? '';
    const hasText = this.lastText.trim().length > 0;

    // If there's no text, don't assert 'format' (let 'required' handle empties)
    if (!hasText) {
      this.mergeErrors({ format: null });
      return;
    }

    // Strict format check from provided regex pattern (derived from placeholder)
    const pattern = this.field.pattern ? new RegExp(this.field.pattern) : null;
    if (pattern && !pattern.test(this.lastText)) {
      this.mergeErrors({ format: { text: this.lastText } });  // <-- adds 'format'
    } else {
      this.mergeErrors({ format: null });                      // <-- removes 'format'
    }
  }

  /** Merge/remove specific error keys without clobbering others (e.g., min/max/parse) */
  private mergeErrors(patch: ValidationErrors) {
    const existing = this.control.errors ?? {};
    const next: ValidationErrors = { ...existing };

    Object.keys(patch).forEach(k => {
      if (patch[k] == null) {
        delete next[k];
      } else {
        next[k] = patch[k];
      }
    });

    // Keep null when empty so control becomes valid if no other errors remain
    this.control.setErrors(Object.keys(next).length ? next : null);
  }

  /** Choose the most relevant error to show (format/parse > min/max/filter > required) */
  firstErrorMessage(): string {
    const errors = this.control.errors ?? {};

    // Priority order
    const order = ['format', 'matDatepickerParse', 'matDatepickerMin', 'matDatepickerMax', 'matDatepickerFilter', 'required'];
    const key = order.find(k => k in errors) || Object.keys(errors)[0];

    const map: Record<string, string> = {
      format: 'format',
      matDatepickerParse: 'parse',
      matDatepickerMin: 'minDate',
      matDatepickerMax: 'maxDate',
      matDatepickerFilter: 'dateNotAllowed',
      required: 'required'
    };

    const mapped = map[key] ?? key;

    const i18nKey =
      this.field.errorMessages?.[mapped] ??
      `form.errors.${this.field.name}.${mapped}`;

    const params = this.buildParams(key, errors[key]);
    return this.t.instant(i18nKey, params);
  }

  private buildParams(errorKey: string, errorVal: ValidationErrors[keyof ValidationErrors]): ValidationErrors {
    switch (errorKey) {
      case 'format':
      case 'matDatepickerParse':
        return { text: errorVal?.text ?? this.lastText ?? '' };
      case 'matDatepickerMin':
        return { min: this.formatDate(errorVal?.min) };
      case 'matDatepickerMax':
        return { max: this.formatDate(errorVal?.max) };
      default:
        return {};
    }
  }

  private formatDate(d: unknown): string {
    if (!(d instanceof Date)) return '';
    return this.dateAdapter.format(d, this.dateFormats.display.dateInput);
  }
}
