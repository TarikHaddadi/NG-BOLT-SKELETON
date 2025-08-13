
import { FormControl, ValidatorFn } from '@angular/forms';

export type FieldType = 'text' | 'email' | 'phone' | 'password' | 'toggle' | 'dropdown' | 'range' | 'group' | 'array' | 'datepicker' | 'chips' | 'autocomplete' | 'textarea';

export interface FieldComponent {
  field: FieldConfig;
  control: FormControl;
}


export interface FieldConfig {
  type: FieldType;
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  validators?: ValidatorFn[];
  disabled?: boolean;
  hidden?: boolean;
  children?: FieldConfig[];
  multiple?: boolean;
  errorMessages?: Record<string, string>;
  layoutClass?: string;
  defaultValue?: string | number | boolean; // for text/email/phone/password, etc.
  chipOptions?: string[];
  autocompleteOptions?: string[];
  toggleIcons?: {
    on: string;
    off: string;
    position?: 'start' | 'end';
  };
  color?: 'primary' | 'accent' | 'warn';
  rows?: number;
  maxRows?: number;
  autoResize?: boolean;
  showCounter?: boolean;
}