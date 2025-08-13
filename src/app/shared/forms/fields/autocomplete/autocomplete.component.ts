import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, map, startWith } from 'rxjs';
import { FieldConfig } from '@core/interfaces';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, TranslateModule],
  template: `
    <mat-form-field appearance="outline" class="w-full" floatLabel="always">
      <mat-label>{{ field.label | translate }}</mat-label>

      <input
        matInput
        type="text"
        [id]="field.name"
        [formControl]="control"
        [matAutocomplete]="auto"
        [attr.placeholder]="(field.placeholder ?? '') | translate"
        [attr.pattern]="field.pattern || null"
        [attr.minlength]="field.minLength || null"
        [attr.maxlength]="field.maxLength || null"
        autocomplete="off"
        (blur)="control.markAsTouched()"

        [attr.aria-label]="field.label | translate"
        [attr.aria-describedby]="ariaDescribedBy"
        [attr.aria-invalid]="control.invalid || null"
        [attr.aria-required]="field.required || null"
      />

      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="displayWith"
        (optionSelected)="onSelected($event)"
        (closed)="control.markAsTouched()"
      >
        <mat-option
          *ngFor="let option of filteredOptions$ | async; trackBy: trackByIndex"
          [value]="option"
        >
          {{ option | translate }}
        </mat-option>
      </mat-autocomplete>

      <mat-hint *ngIf="field.helperText && !showError" [id]="hintId">
        {{ field.helperText | translate }}
      </mat-hint>

      <mat-error *ngIf="showError" [id]="errorId" role="alert" aria-live="polite">
        {{ errorText }}
      </mat-error>
    </mat-form-field>
  `,
  styleUrls:["./autocomplete.component.scss"]
})
export class AutocompleteComponent implements OnInit {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) control!: FormControl<string>;

  filteredOptions$!: Observable<string[]>;

  constructor(private t: TranslateService) {}

  ngOnInit(): void {
    const all = this.field.autocompleteOptions ?? [];
    // live filter
    this.filteredOptions$ = this.control.valueChanges.pipe(
      startWith(this.control.value ?? ''),
      map(v => this.filter(all, v ?? ''))
    );
  }

  // --- filtering / display ---
  private filter(options: string[], value: string): string[] {
    const v = (value ?? '').toLowerCase();
    if (!v) return options;
    return options.filter(o => o.toLowerCase().includes(v));
  }
  displayWith = (val: string | null) => val ?? '';

  onSelected(event: MatAutocompleteSelectedEvent) {
    console.log(event);
    // ensure touched when selected via keyboard/mouse
    this.control.markAsTouched();
  }

  trackByIndex = (i: number) => i;

  // --- ARIA helpers ---
  get showError(): boolean { return !!(this.control?.touched && this.control?.invalid); }
  get hintId()  { return `${this.field.name}-hint`; }
  get errorId() { return `${this.field.name}-error`; }
  get ariaDescribedBy(): string | null {
    if (this.showError) return this.errorId;
    if (this.field.helperText) return this.hintId;
    return null;
  }

  // --- Error text with interpolation & fallbacks ---
  get errorText(): string {
    const errs = this.control?.errors ?? {};
    if (!errs || !Object.keys(errs).length) return '';

    // prioritize common autocomplete errors
    const order = ['required', 'minlength', 'maxlength', 'optionNotAllowed', 'pattern'];
    const key = order.find(k => k in errs) || Object.keys(errs)[0];

    const override = this.field.errorMessages?.[key];
    const fallback = `form.errors.${this.field.name}.${key}`;
    const i18nKey = override ?? fallback;

    const params = this.paramsFor(key, errs[key]);
    return this.t.instant(i18nKey, params);
  }

  private paramsFor(key: string, val: ValidationErrors[keyof ValidationErrors]): ValidationErrors {
    switch (key) {
      case 'minlength':
      case 'maxlength':
        return { requiredLength: val?.requiredLength, actualLength: val?.actualLength };
      default:
        return {};
    }
  }
}
