import { Component, Input, OnChanges, Type, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  TextFieldComponent,
  TextInputComponent,
  ToggleComponent,
  SelectComponent,
  RangeComponent,
  DatepickerComponent,
  ChipsComponent,
  AutocompleteComponent
} from '@shared';
import { FieldComponent, FieldConfig, FieldType } from '@core/interfaces';


const MAP: Partial<Record<FieldType, Type<FieldComponent>>> = {
  textarea: TextFieldComponent,
  text: TextInputComponent,
  email: TextInputComponent,
  phone: TextInputComponent,
  password: TextInputComponent,
  datepicker: DatepickerComponent,
  chips: ChipsComponent,
  autocomplete: AutocompleteComponent,
  toggle: ToggleComponent,
  dropdown: SelectComponent,
  range: RangeComponent
};

@Component({
  selector: 'app-field-host',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <ng-container *ngIf="component() as cmp" class="container">
      <ng-container *ngComponentOutlet="cmp; inputs: inputs()"></ng-container>
    </ng-container>
  `,
  styleUrls: ["./field-host.component.scss"]
})
export class FieldHostComponent implements OnChanges {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) control!: FormControl;

  component = computed<Type<FieldComponent> | undefined>(() => MAP[this.field.type]);
  inputs = signal<Record<string, unknown>>({});

  ngOnChanges() {
    this.inputs.set({ field: this.field, control: this.control });
  }
}