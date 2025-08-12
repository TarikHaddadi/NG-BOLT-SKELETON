import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FieldConfig } from '../../field-config.model';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, TranslateModule],
  template: `
    <mat-form-field appearance="outline" class="w-full" floatLabel="always">
      <mat-label>{{ field.label | translate }}</mat-label>

      <input
        matInput
        [id]="field.name"
        [type]="inputType"
        [formControl]="control"
        [placeholder]="(field.placeholder ?? '') | translate"
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
      />

      <mat-hint *ngIf="field.helperText && !showError" [id]="hintId">
        {{ field.helperText | translate }}
      </mat-hint>

      <mat-error *ngIf="showError" [id]="errorId" role="alert" aria-live="polite">
        {{ errorMessage }}
      </mat-error>
    </mat-form-field>
  `,
  styleUrls:["./text-input.component.scss"]
})
export class TextInputComponent {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) control!: FormControl<string>;

  constructor(private t: TranslateService) { }

  // --- UI helpers ---
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

  get patternAttr() {
    const types = ['text', 'email', 'password', 'phone', 'autocomplete'];
    return types.includes(this.field.type) ? (this.field.pattern ?? null) : null;
  }
  // --- ARIA ids ---
  get hintId() { return `${this.field.name}-hint`; }
  get errorId() { return `${this.field.name}-error`; }

  get showError(): boolean {
    return !!(this.control?.touched && this.control?.invalid);
  }

  get ariaDescribedBy(): string | null {
    if (this.showError) return this.errorId;
    if (this.field.helperText) return this.hintId;
    return null;
  }

  // --- Error building with interpolation + fallbacks ---
  get errorMessage(): string {
    const errs = this.control.errors ?? {};
    if (!errs || !Object.keys(errs).length) return '';

    // Common text-input priorities
    const order = ['required', 'emailDomain', 'emailTld', 'email', 'minlength', 'maxlength', 'pattern'];
    const key = order.find(k => k in errs) || Object.keys(errs)[0];

    // Allow per-field overrides (your configs already use full keys like "form.errors.input.required")
    const overrideKey = this.field.errorMessages?.[key];
    const fallbackKey = `form.errors.${this.field.name}.${key}`;
    const i18nKey = overrideKey ?? fallbackKey;

    const params = this.paramsFor(key, errs[key]);
    return this.t.instant(i18nKey, params);
  }

  private paramsFor(key: string, val: ValidationErrors[keyof ValidationErrors]): ValidationErrors {
    switch (key) {
      case 'minlength':
      case 'maxlength':
        return { requiredLength: val?.requiredLength, actualLength: val?.actualLength };
      case 'invalidChars':
        return { char: val?.char ?? '' };
      case 'pattern':
        return { text: this.control?.value ?? '' };
      default:
        return {};
    }
  }
}
