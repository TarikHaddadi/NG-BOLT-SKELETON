import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { FieldConfig } from './field-config.model';
import { FieldHostComponent } from './field-host/field-host.component';
import { buildValidators } from './utils';

type SelValue = string | number;

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, FieldHostComponent],
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss']
})
export class DynamicFormComponent implements OnInit {
  @Input() config: FieldConfig[] = [];
  @Input() form!: FormGroup;

  private fb = inject(FormBuilder);
  public translateService = inject(TranslateService);

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    for (const field of this.config) {
      if (field.type === 'group') {
        const group = this.fb.group({});
        this.form.addControl(field.name, group);
        (field.children ?? []).forEach(ch => {
          group.addControl(ch.name, this.createControl(ch));
        });
        continue;
      }

      if (field.type === 'array') {
        this.form.addControl(field.name, this.fb.control([]));
        continue;
      }

      this.form.addControl(field.name, this.createControl(field));
    }
  }
  
  private createControl(field: FieldConfig): FormControl {
    const validators = buildValidators(field);

    switch (field.type) {
      case 'toggle':
        return new FormControl<boolean>(
          { value: field.defaultValue ? Boolean(field.defaultValue) : false, disabled: !!field.disabled },
          { nonNullable: true, validators }
        );

      case 'range':
        return new FormControl<number | null>(
          { value: (field.defaultValue ? parseInt(field.defaultValue.toString(), 10) : field.min ? field.min : 0), disabled: !!field.disabled },
          { validators }
        );

      case 'datepicker':
        return new FormControl<Date | null>(
          { value: null, disabled: !!field.disabled },
          { validators }
        );

      case 'chips':
      case 'dropdown': {
        const multiple = field.multiple === true;
        if (multiple) {
          return new FormControl<SelValue[]>(
            { value: [], disabled: !!field.disabled },
            { validators }
          );
        }
        // single select → start at null so "required" works
        return new FormControl<SelValue | null>(
          { value: null, disabled: !!field.disabled },
          { validators }
        );
      }

      // text / email / phone / password / autocomplete …
      default:
        return new FormControl<string>(
          { value: field.defaultValue?.toString() ?? '', disabled: !!field.disabled },
          { nonNullable: true, validators }
        );
    }
  }

  controlOf(name: string): FormControl {
    return this.form.get(name) as FormControl;
  }
}