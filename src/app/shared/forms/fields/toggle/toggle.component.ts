import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FieldConfig } from '../../field-config.model';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSlideToggleModule, MatIconModule, TranslateModule],
  template: `
    <div class="toggle-field">
      <mat-slide-toggle
        [formControl]="control"
        [color]="field.color || 'accent'"
        [attr.aria-label]="field.label | translate"
        [attr.aria-checked]="control.value"
        [attr.aria-invalid]="control.invalid || null"
        [attr.aria-required]="field.required || null"
        [attr.aria-describedby]="ariaDescribedBy"
        [attr.aria-disabled]="control.disabled || null"
        (change)="markTouched()"
        (blur)="markTouched()"
      >
        <ng-container *ngIf="field.toggleIcons?.position !== 'end'">
          <mat-icon class="toggle-icon" aria-hidden="true">
            {{ control.value ? (field.toggleIcons?.on || 'check') : (field.toggleIcons?.off || 'close') }}
          </mat-icon>
        </ng-container>

        <span class="toggle-label">{{ field.label | translate }}</span>

        <ng-container *ngIf="field.toggleIcons?.position === 'end'">
          <mat-icon class="toggle-icon" aria-hidden="true">
            {{ control.value ? (field.toggleIcons?.on || 'check') : (field.toggleIcons?.off || 'close') }}
          </mat-icon>
        </ng-container>
      </mat-slide-toggle>

      <div *ngIf="field.helperText && !showError" class="toggle-hint" [id]="hintId">
        {{ field.helperText | translate }}
      </div>

      <div *ngIf="showError" class="toggle-error" [id]="errorId" role="alert" aria-live="polite">
        {{ errorText }}
      </div>
    </div>
  `,
  styleUrls: ['./toggle.component.scss']
})
export class ToggleComponent {
  @Input({ required: true }) field!: FieldConfig & {
    toggleIcons?: { on: string; off: string; position?: 'start' | 'end' };
    color?: 'primary' | 'accent' | 'warn';
  };
  @Input({ required: true }) control!: FormControl<boolean>;

  constructor(private t: TranslateService) {}

  get showError() { return !!(this.control?.touched && this.control?.invalid); }
  get hintId()  { return `${this.field.name}-hint`; }
  get errorId() { return `${this.field.name}-error`; }

  get ariaDescribedBy(): string | null {
    if (this.showError) return this.errorId;
    if (this.field.helperText) return this.hintId;
    return null;
  }

  markTouched() { this.control?.markAsTouched(); }

  get errorText(): string {
    const errs = this.control?.errors ?? {};
    if (!errs || !Object.keys(errs).length) return '';

    // prioritize boolean-toggle errors
    const order = ['requiredTrue', 'required'];
    const rawKey = order.find(k => k in errs) || Object.keys(errs)[0];

    // normalize requiredTrue -> required for i18n reuse
    const mapped = rawKey === 'requiredTrue' ? 'required' : rawKey;

    const i18nKey =
      this.field.errorMessages?.[mapped] ??
      `form.errors.${this.field.name}.${mapped}`;

    return this.t.instant(i18nKey);
  }
}
