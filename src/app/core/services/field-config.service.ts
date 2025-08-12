import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { allowedCharsValidator, datePatternFromPlaceholder, emailTldValidator, FieldConfig, minArrayLength, optionInListValidator, passwordStrengthValidator, phoneDigitCount } from '../../shared/shared';

@Injectable({ providedIn: 'root' })
export class FieldConfigService {

    getTextAreaField(label = 'textarea', placeholder = 'Write your text', maxLength = 500): FieldConfig {
        return {
            type: 'textarea',
            name: 'textarea',
            label,
            placeholder,
            helperText: 'form.hints.textarea',
            required: false,
            minLength: 0,
            maxLength,
            autoResize: true,
            rows: 3,
            maxRows: 10,
            showCounter: true,
            validators: [Validators.maxLength(500)],
            errorMessages: {
                minlength: 'form.errors.textarea.minlength',
                maxlength: 'form.errors.textarea.maxlength'
            },
            layoutClass: 'col-12'
        };
    }

    getTextField(label = 'Username', placeholder = 'Enter username'): FieldConfig {
        // Disallow anything *not* in the set (Unicode letters, digits, _, -, ., space)
        const disallowed = new RegExp('[^\\p{L}0-9_\\-. ]', 'u');

        return {
            type: 'text',
            name: 'input',
            label,
            placeholder,
            required: true,
            helperText: 'form.hints.input',
            minLength: 3,
            maxLength: 50,
            // keep pattern only for the HTML attribute if you want; validation is granular now
            //pattern: '^[\\p{L}0-9_\\-\\. ]{3,50}$',
            validators: [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(50),
                allowedCharsValidator(disallowed)  // <- activate this for granular invalidChars
            ],
            disabled: false,
            hidden: false,
            children: [],
            errorMessages: {
                required: 'form.errors.input.required',
                minlength: 'form.errors.input.minlength',   // uses {{requiredLength}}, {{actualLength}}
                maxlength: 'form.errors.input.maxlength',
                invalidChars: 'form.errors.input.invalidChars' // uses {{char}}
            },
            layoutClass: 'col-12',
            chipOptions: [],
            autocompleteOptions: [],
        };
    }

    getEmailField(label = 'Email', placeholder = 'Enter your email'): FieldConfig {
        return {
            type: 'email',
            name: 'email',
            label,
            placeholder,
            required: true,
            helperText: 'form.hints.email',
            maxLength: 254,
            validators: [
                Validators.required,
                Validators.email,
                Validators.maxLength(254),
                emailTldValidator(2) // <— flags 1-char TLDs
            ],
            errorMessages: {
                required: 'form.errors.email.required',
                email: 'form.errors.email.invalid',
                emailTld: 'form.errors.email.tld',      // add this in i18n
                emailDomain: 'form.errors.email.domain',   // optional (no dot)
                maxlength: 'form.errors.email.maxlength'
            }, disabled: false,
            hidden: false,
            children: [],

            layoutClass: 'col-12',
            chipOptions: [],
            autocompleteOptions: [],
        };
    }

    getPasswordField(label = 'Password', placeholder = 'Enter password'): FieldConfig {
        const minLength = 8;
        return {
            type: 'password',
            name: 'password',
            label,
            placeholder,
            required: true,
            helperText: 'form.hints.password',
            minLength,
            maxLength: 128,
            // no big regex here; use granular rules:
            validators: [
                Validators.required,
                Validators.maxLength(128),
                passwordStrengthValidator({ minLength, minUpper: 1, minDigits: 1 })
                // add { minSpecial: 1 } if you want a special char rule
            ],
            disabled: false,
            hidden: false,
            children: [],
            errorMessages: {
                required: 'form.errors.password.required',
                minlength: 'form.errors.password.minlength', // {{requiredLength}}, {{actualLength}}
                maxlength: 'form.errors.password.maxlength',
                uppercase: 'form.errors.password.uppercase', // e.g. “At least one uppercase letter”
                digit: 'form.errors.password.digit',     // e.g. “At least one number”
                special: 'form.errors.password.special'    // (only if you enable minSpecial)
            },
            layoutClass: 'col-12',
            chipOptions: [],
            autocompleteOptions: [],
        };
    }

    getPhoneField(label = 'Phone Number', placeholder = '+35212345678'): FieldConfig {
        //const phoneRegex = '^\\+[1-9][0-9]{7,14}$'; // or the "spaces/dashes" one above
        const phoneRegex = '^\\+?[1-9][0-9 \\-]{7,14}$';
        return {
            type: 'phone',
            name: 'phone',
            label,
            placeholder,
            required: true,
            pattern: phoneRegex,
            validators: [
                // for strict E.164 this is enough:
                Validators.required,
                Validators.pattern(phoneRegex),

                // if you used the "spaces/dashes" pattern, also add:
                phoneDigitCount(8, 15)
            ],
            errorMessages: {
                required: 'form.errors.phone.required',
                pattern: 'form.errors.phone.invalid',
                phoneDigitsLen: 'form.errors.phone.invalid'
            },
            layoutClass: 'col-md-6',
            defaultValue: "+352"
        };
    }

    getToggleField(label = 'Enable notifications'): FieldConfig {
        return {
            type: 'toggle',
            name: 'notify',
            label,
            placeholder: '',
            required: false,
            helperText: 'form.hints.notify',
            options: undefined,
            min: undefined,
            max: undefined,
            step: undefined,
            minLength: undefined,
            maxLength: undefined,
            pattern: undefined,
            validators: [],
            disabled: false,
            hidden: false,
            children: [],
            errorMessages: {
                required: 'form.errors.notify.required',
            },
            layoutClass: 'col-md-6',
            chipOptions: [],
            autocompleteOptions: [],
        };
    }

    getDropdownField(
        label = 'Role',
        options = [
            { label: 'Admin', value: 'admin' },
            { label: 'User', value: 'user' },
            { label: 'Manager', value: 'manager' },
        ],
        multiple = false
    ): FieldConfig {
        return {
            type: 'dropdown',
            name: 'role',
            label,
            placeholder: 'Select a role',
            required: true,
            helperText: 'form.hints.role',
            options,
            min: undefined,
            max: undefined,
            step: undefined,
            minLength: undefined,
            maxLength: undefined,
            pattern: undefined,
            multiple,
            validators: [Validators.required],
            disabled: false,
            hidden: false,
            children: [],
            errorMessages: {
                required: 'form.errors.role.required',
            },
            layoutClass: 'col-md-6',
            chipOptions: [],
            autocompleteOptions: [],
        };
    }

    getRangeField(label = 'Notification Volume', min = 0, max = 100, step = 5): FieldConfig {
        return {
            type: 'range',
            name: 'volume',
            label,
            placeholder: '',
            required: true,
            helperText: 'form.hints.volume',
            options: undefined,
            min,
            max,
            step,
            minLength: undefined,
            maxLength: undefined,
            pattern: undefined,
            validators: [Validators.required, Validators.min(min), Validators.max(max)],
            disabled: false,
            hidden: false,
            children: [],
            errorMessages: {
                required: 'form.errors.volume.required',
                min: 'form.errors.volume.min',
                max: 'form.errors.volume.max',
            },
            layoutClass: 'col-12',
            chipOptions: [],
            autocompleteOptions: [],
            defaultValue: 20
        };
    }

    getDatepickerField(label = 'Date of Birth'): FieldConfig {
        const placeholder = 'YYYY-MM-DD'; // UI text
        const pattern = datePatternFromPlaceholder(placeholder); // strict regex

        return {
            type: 'datepicker',
            name: 'dob',
            label,
            placeholder,          // shown to user
            pattern,              // consumed by DatepickerComponent's onRawInput()
            required: true,
            helperText: 'form.hints.dob',
            // DO NOT add Validators.pattern here; control value is Date|null
            validators: [Validators.required],
            errorMessages: {
                required: 'form.errors.dob.required',
                format: 'form.errors.dob.format',
                matDatepickerParse: 'form.errors.dob.parse',
                matDatepickerMin: 'form.errors.dob.minDate',
                matDatepickerMax: 'form.errors.dob.maxDate',
                matDatepickerFilter: 'form.errors.dob.dateNotAllowed'
            },
            layoutClass: 'col-md-6',
        };
    }

    getChipsField(label = 'Tags', chipOptions = ['Angular', 'React', 'Vue'],multiple = false): FieldConfig {
        return {
            type: 'chips',
            name: 'tags',
            label,
            placeholder: 'Add tags',
            required: true,
            helperText: 'form.hints.tags',
            options: undefined,
            min: undefined,
            max: undefined,
            step: undefined,
            minLength: undefined,
            maxLength: undefined,
            pattern: undefined,
            validators: [minArrayLength(1)],
            disabled: false,
            hidden: false,
            multiple,
            children: [],
            errorMessages: {
                minlengthArray: 'form.errors.tags.minOne',
            },
            layoutClass: 'col-12',
            chipOptions,
            autocompleteOptions: [],
        };
    }

    getAutocompleteField(label = 'Country', options = ['Luxembourg', 'Germany', 'France']): FieldConfig {
        return {
            type: 'autocomplete',
            name: 'country',
            label,
            placeholder: 'Start typing…',
            required: true,
            helperText: 'form.hints.country',
            options: undefined,
            min: undefined,
            max: undefined,
            step: undefined,
            minLength: 2,
            maxLength: 56,
            pattern: undefined,
            validators: [Validators.required, optionInListValidator(options)],
            disabled: false,
            hidden: false,
            children: [],
            errorMessages: {
                required: 'form.errors.country.required',
                optionNotAllowed: 'form.errors.country.notAllowed',
            },
            layoutClass: 'col-md-6',
            chipOptions: [],
            autocompleteOptions: options,
        };
    }

    getAllFields(): FieldConfig[] {
        return [
            this.getTextField(),
            this.getEmailField(),
            this.getPasswordField(),
            this.getPhoneField(),
            this.getToggleField(),
            this.getDropdownField(),
            this.getRangeField(),
            this.getDatepickerField(),
            this.getChipsField(),
            this.getAutocompleteField(),
            this.getTextAreaField()
        ];
    }
}