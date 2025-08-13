import { Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { FieldConfig } from '@core/interfaces';

const textTypes: FieldConfig['type'][] = ['text', 'email', 'phone', 'password', 'chips', 'autocomplete'];

export function buildValidators(field: FieldConfig): ValidatorFn[] {
  const v: ValidatorFn[] = [];

  if (field.required) {
    v.push(field.type === 'toggle' ? Validators.requiredTrue : Validators.required);
  }

  if (field.minLength && textTypes.includes(field.type)) v.push(Validators.minLength(field.minLength));
  if (field.maxLength && textTypes.includes(field.type)) v.push(Validators.maxLength(field.maxLength));

  // ✅ Only apply regex to text-like fields (NOT datepicker)
  if (field.pattern && textTypes.includes(field.type)) v.push(Validators.pattern(field.pattern));

  if (typeof field.min === 'number' && field.type === 'range') v.push(Validators.min(field.min));
  if (typeof field.max === 'number' && field.type === 'range') v.push(Validators.max(field.max));

  if (field.validators?.length) v.push(...field.validators);
  return v;
}


/** Fail on the first disallowed character. Example: /[^\p{L}0-9_.\- ]/u */
export function allowedCharsValidator(disallowed: RegExp): ValidatorFn {
  return (c: AbstractControl<string | null>): ValidationErrors | null => {
    const v = c.value ?? '';
    if (!v) return null;
    const m = v.match(disallowed);
    return m ? { invalidChars: { char: m[0] } } : null;
  };
}

/** Password rules → separate errors for each missing requirement */
export function passwordStrengthValidator(opts: {
  minLength?: number; minUpper?: number; minDigits?: number; minSpecial?: number;
} = { minLength: 8, minUpper: 1, minDigits: 1, minSpecial: 0 }): ValidatorFn {
  const { minLength = 8, minUpper = 1, minDigits = 1, minSpecial = 0 } = opts;
  const upperRe = /[A-Z]/g;
  const digitRe = /\d/g;
  const specialRe = /[^A-Za-z0-9]/g;

  return (c: AbstractControl<string | null>): ValidationErrors | null => {
    const v = c.value ?? '';
    const errs: ValidationErrors = {};

    if (v.length < minLength) errs['minlength'] = { requiredLength: minLength, actualLength: v.length };
    if ((v.match(upperRe)?.length ?? 0) < minUpper) errs['uppercase'] = true;
    if ((v.match(digitRe)?.length ?? 0) < minDigits) errs['digit'] = true;
    if (minSpecial > 0 && (v.match(specialRe)?.length ?? 0) < minSpecial) errs['special'] = true;

    return Object.keys(errs).length ? errs : null;
  };
}

export function emailTldValidator(minTld = 2): ValidatorFn {
  return (c: AbstractControl<string | null>): ValidationErrors | null => {
    const v = (c.value ?? '').trim();
    const i = v.lastIndexOf('@');
    if (i <= 0) return null; // let Validators.email handle "no @" cases
    const domain = v.slice(i + 1);
    const j = domain.lastIndexOf('.');
    if (j <= 0) return { emailDomain: true }; // no dot in domain
    const tld = domain.slice(j + 1);
    return tld.length < minTld ? { emailTld: { min: minTld } } : null;
  };
}

export function phoneDigitCount(min = 8, max = 15): ValidatorFn {
  return (c: AbstractControl<string | null>): ValidationErrors | null => {
    const digits = (c.value ?? '').replace(/\D/g, '');
    return digits.length >= min && digits.length <= max
      ? null
      : { phoneDigitsLen: { min, max, actual: digits.length } };
  };
}

/** Validates that at least one value (string) is in the list */
export function optionInListValidator(list: string[]): ValidatorFn {
  return (c: AbstractControl) => (list.includes(c.value) ? null : { optionNotAllowed: true });
};

/** Validates that a table contains at least one item */
export function minArrayLength(min: number): ValidatorFn {
  return (c: AbstractControl) => {
    const v = c.value;
    const length = Array.isArray(v) ? v.length : (v == null || v === '' ? 0 : 1);
    return length >= min ? null : { minlengthArray: { requiredLength: min, actualLength: length } };
  };
}

export function datePatternFromPlaceholder(ph: string): string {
  // Accept both YYYY and yyyy tokens
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return '^' + esc(ph)
    .replace(/(YYYY|yyyy)/g, '\\d{4}')
    .replace(/MM/g, '(0[1-9]|1[0-2])')
    .replace(/(DD|dd)/g, '(0[1-9]|[12]\\d|3[01])')
    + '$';
}