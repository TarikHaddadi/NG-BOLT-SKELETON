import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FieldConfig } from '@core/interfaces';

@Component({
  selector: 'app-range',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSliderModule, TranslateModule],
  template: `
    <div class="range-row">
      <span class="mat-label" [id]="labelId">{{ field.label | translate }}</span>

      <!-- Always-visible value -->
      <output
        class="range-value"
        [id]="valueId"
        aria-live="polite"
        [attr.aria-atomic]="true"
      >
        {{ valueText }}
      </output>
    </div>

    <mat-slider
      [id]="field.name"
      [color]="field.color || 'primary'"
      [min]="field.min ?? 0"
      [max]="field.max ?? 100"
      [step]="field.step ?? 1"
      [attr.aria-label]="field.label | translate"
      [attr.aria-describedby]="ariaDescribedByWithValue"
      [attr.aria-invalid]="control.invalid || null"
      [attr.aria-required]="field.required || null"
      [discrete]="true"
      [showTickMarks]="field.step ? true : false"
    >
      <input
        matSliderThumb
        [formControl]="control"
        [attr.aria-describedby]="ariaDescribedByWithValue"
      />
    </mat-slider>

    <!-- Helper text -->
    <div *ngIf="field.helperText && !showError" class="mat-hint" [id]="hintId">
      {{ field.helperText | translate }}
    </div>

    <!-- Error message -->
    <div *ngIf="showError" class="mat-error" [id]="errorId" role="alert" aria-live="polite">
      {{ errorMessage }}
    </div>
  `,
  styleUrls: ['./range.component.scss']
})
export class RangeComponent {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) control!: FormControl<number | null>;
  /** Optional formatter for the visible value label */
  @Input() displayWith?: (value: number | null) => string;

  constructor(private t: TranslateService) {}

  get showError(): boolean {
    return !!(this.control?.touched && this.control?.invalid);
  }

  get labelId() { return `${this.field.name}-label`; }
  get hintId()  { return `${this.field.name}-hint`; }
  get errorId() { return `${this.field.name}-error`; }
  get valueId() { return `${this.field.name}-value`; }

  /** Merge the normal described-by with the always-visible value label for SRs */
  get ariaDescribedByWithValue(): string {
    const ids: string[] = [this.valueId];
    if (this.showError) ids.push(this.errorId);
    else if (this.field.helperText) ids.push(this.hintId);
    return ids.join(' ');
  }

  get valueText(): string {
    const v = this.control?.value ?? this.field.min ?? 0;
    return (this.displayWith || this.defaultDisplayWith)(v);
  }

  defaultDisplayWith = (v: number | null) => (v ?? 0).toString();

  get errorMessage(): string {
    const errs = this.control?.errors ?? {};
    if (!errs || !Object.keys(errs).length) return '';
    const order = ['required', 'min', 'max'];
    const key = order.find(k => k in errs) || Object.keys(errs)[0];
    const i18nKey = this.field.errorMessages?.[key] ?? `form.errors.${this.field.name}.${key}`;
    const params = this.paramsFor(key, errs[key]);
    return this.t.instant(i18nKey, params);
  }

  private paramsFor(key: string, val: ValidationErrors[keyof ValidationErrors]):ValidationErrors {
    switch (key) {
      case 'min': return { min: val?.min, actual: val?.actual };
      case 'max': return { max: val?.max, actual: val?.actual };
      default:    return {};
    }
  }
}
