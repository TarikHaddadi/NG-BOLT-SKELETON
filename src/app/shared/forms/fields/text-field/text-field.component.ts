import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextFieldModule } from '@angular/cdk/text-field';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FieldConfig } from '@core/interfaces';

@Component({
  standalone: true,
  selector: 'app-text-field',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, TextFieldModule, TranslateModule],
  template: `
    <mat-form-field appearance="outline" class="w-full" floatLabel="always">
      <mat-label>{{ field.label | translate }}</mat-label>

      <!-- Textarea mode -->
      <textarea
        *ngIf="isTextarea; else singleLine"
        matInput
        [id]="field.name"
        [formControl]="control"
        [placeholder]="(field.placeholder || '') | translate"
        [attr.minlength]="field.minLength || null"
        [attr.maxlength]="field.maxLength || null"
        [attr.aria-label]="field.label | translate"
        [attr.aria-describedby]="ariaDescribedBy"
        [attr.aria-invalid]="control.invalid || null"
        [attr.aria-required]="field.required || null"
        [attr.aria-disabled]="control.disabled || null"
        (blur)="control.markAsTouched()"
        cdkTextareaAutosize
        [cdkAutosizeMinRows]="minRows"
        [cdkAutosizeMaxRows]="maxRows"
        [rows]="!field.autoResize ? minRows : null"
      ></textarea>

      <!-- Input mode -->
      <ng-template #singleLine>
        <textarea 
          matInput
          [id]="field.name"
          [type]="inputType"
          [formControl]="control"
          [maxlength]="field.maxLength || null"
          [placeholder]="(field.placeholder || '') | translate"
          [attr.pattern]="patternAttr"
          [attr.minlength]="field.minLength || null"
          [attr.maxlength]="field.maxLength || null"
          [attr.inputmode]="inputMode"
          [attr.autocomplete]="autoComplete"
          (blur)="control.markAsTouched()"
          [attr.aria-label]="field.label | translate"
          [attr.aria-describedby]="ariaDescribedBy"
          [attr.aria-invalid]="control.invalid || null"
          [attr.aria-required]="field.required || null"
          [attr.aria-disabled]="control.disabled || null"
        ></textarea>
      </ng-template>

      <!-- Hint (left) -->
      <mat-hint *ngIf="field.helperText && !showError" [id]="hintId">
        {{ field.helperText | translate:{ max: field.maxLength } }}
      </mat-hint>

      <!-- Counter (right) -->
      <mat-hint *ngIf="field.showCounter && field.maxLength" align="end">
        {{ charCount }} / {{ field.maxLength }}
      </mat-hint>

      <mat-error *ngIf="showError" [id]="errorId" role="alert" aria-live="polite">
        {{ errorText }}
      </mat-error>
    </mat-form-field>
  `,
  styleUrls:["./text-field.component.scss"]
})
export class TextFieldComponent {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) control!: FormControl<string>;

  constructor(private t: TranslateService) { }

  get isTextarea() { return this.field.type === 'textarea'; }

  // textarea sizing
  get minRows() { return this.field.rows ?? 3; }
  get maxRows() { return this.field.maxRows ?? (this.field.autoResize ? 8 : this.minRows); }

  // ---- input attributes (single line only) ----
  get inputType(): string {
    switch (this.field.type) {
      case 'email': return 'email';
      case 'password': return 'password';
      case 'phone': return 'tel';
      default: return 'text';
    }
  }
  get inputMode(): string | null {
    switch (this.field.type) {
      case 'email': return 'email';
      case 'phone': return 'numeric';
      default: return null;
    }
  }
  get autoComplete(): string | null {
    switch (this.field.type) {
      case 'email': return 'email';
      case 'password': return 'new-password';
      case 'phone': return 'tel';
      default: return 'on';
    }
  }
  get patternAttr(): string | null {
    const textTypes = ['text', 'email', 'password', 'phone', 'autocomplete'];
    return textTypes.includes(this.field.type) && this.field.pattern ? this.field.pattern : null;
  }

  // ---- ARIA helpers ----
  get showError(): boolean { return !!(this.control?.touched && this.control?.invalid); }
  get hintId() { return `${this.field.name}-hint`; }
  get errorId() { return `${this.field.name}-error`; }
  get ariaDescribedBy(): string | null {
    if (this.showError) return this.errorId;
    if (this.field.helperText) return this.hintId;
    return null;
  }


  get charCount(): number {
    const v = this.control?.value as unknown;
    return typeof v === 'string' ? v.length : Array.isArray(v) ? v.length : 0;
  }

  // ---- error text with interpolation + fallbacks ----
  get errorText(): string {
    const errs = this.control?.errors ?? {};
    if (!errs || !Object.keys(errs).length) return '';

    const order = ['required', 'minlength', 'maxlength', 'invalidChars', 'pattern'];
    const key = order.find(k => k in errs) || Object.keys(errs)[0];

    const override = this.field.errorMessages?.[key];
    const fallback = `form.errors.${this.field.name}.${key}`;
    const i18nKey = override ?? fallback;

    return this.t.instant(i18nKey, this.paramsFor(key, errs[key]));
  }

  private paramsFor(key: string, val: ValidationErrors[keyof ValidationErrors]): ValidationErrors {
    switch (key) {
      case 'minlength':
      case 'maxlength':
        return { requiredLength: val?.requiredLength, actualLength: val?.actualLength };
      case 'pattern':
        return { text: this.control?.value ?? '' };
      case 'invalidChars':
        return { char: val?.char ?? '' };
      default:
        return {};
    }
  }
}
