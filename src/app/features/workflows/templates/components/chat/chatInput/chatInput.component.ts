import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DynamicFormComponent } from '@cadai/pxs-ng-core/shared';
import { FieldConfig } from '@cadai/pxs-ng-core/interfaces';
import { FieldConfigService } from '@cadai/pxs-ng-core/services';

@Component({
  selector: 'app-chat-input-tpl',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TranslateModule,
    DynamicFormComponent,
  ],
  templateUrl: './chatInput.component.html',
  styleUrls: ['./chatInput.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatInputComponent implements OnInit {
  @Input() maxLength = 4000;
  @Input() disabled = false;
  @Input() loading = false;

  @Output() send = new EventEmitter<string>();

  form!: FormGroup;
  fieldConfig: FieldConfig[] = [];
  characterCount = signal(0);

  constructor(
    private fb: FormBuilder,
    private fieldsConfigService: FieldConfigService,
    private translate: TranslateService
  ) {
    // Track form value changes for character count
    effect(() => {
      // const count = this.characterCount();
      // Can add additional logic here if needed
    });
  }

  ngOnInit(): void {
    this.form = this.fb.group({});
    this.fieldConfig = [
      this.fieldsConfigService.getTextAreaField({
        name: "message",
        label: this.translate.instant('chatTpl.name'),
        placeholder: this.translate.instant('chatTpl.placeholder'),
        showCounter: true,
        maxLength: this.maxLength,
        color: 'primary',
        layoutClass: 'primary',
        rows: 1,
        autoResize: true,
        disabled: this.disabled || this.loading
      }),
    ];

    // Subscribe to form value changes for character count
    this.form.get('message')?.valueChanges.subscribe((value) => {
      this.characterCount.set((value || '').length);
    });
  }

  onSend(): void {
    const message = this.form.get('message')?.value?.trim();
    if (!message || this.disabled || this.loading) return;

    this.send.emit(message);
    this.form.reset();
    this.characterCount.set(0);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  isOverLimit(): boolean {
    return this.characterCount() > this.maxLength;
  }

  canSend(): boolean {
    return !this.disabled && 
           !this.loading && 
           !!this.form.get('message')?.value?.trim() && 
           !this.isOverLimit();
  }
}