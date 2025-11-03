import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  computed,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DynamicFormComponent } from '@cadai/pxs-ng-core/shared';
import { FieldConfig } from '@cadai/pxs-ng-core/interfaces';
import { FieldConfigService } from '@cadai/pxs-ng-core/services';
import { ChatMessage, ChatConfig } from '../../../../utils/chatTpl.interface';

@Component({
  selector: 'app-chat-message-tpl',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    TranslateModule,
    DynamicFormComponent,
  ],
  templateUrl: './chatMessage.component.html',
  styleUrls: ['./chatMessage.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent implements OnInit {
  @Input() message!: ChatMessage;
  @Input() config!: ChatConfig;
  @Input() currentUserId: string | undefined;

  @Output() delete = new EventEmitter<string>();
  @Output() edit = new EventEmitter<{ id: string; content: string }>();

  isEditing = signal(false);
  editForm!: FormGroup;
  editFieldConfig: FieldConfig[] = [];

  isCurrentUser = computed(() => {
    return this.message?.sender?.id === this.currentUserId;
  });

  isAssistant = computed(() => {
    return this.message?.sender?.type === 'assistant';
  });

  isSystem = computed(() => {
    return this.message?.sender?.type === 'system';
  });

  constructor(
    private fb: FormBuilder,
    private fieldsConfigService: FieldConfigService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Initialize edit form
    this.editForm = this.fb.group({});
    this.editFieldConfig = [
      this.fieldsConfigService.getTextAreaField({
        name: this.translate.instant('chatTpl.editContent') ,
        label: '',
        placeholder: this.translate.instant('chatTpl.editMessage')  ,
        showCounter: true,
        maxLength: 4000,
        color: 'primary',
        layoutClass: 'primary',
        rows: 3,
        autoResize: true,
      }),
    ];
  }

  startEdit(): void {
    this.editForm.patchValue({ editContent: this.message.content });
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editForm.reset();
  }

  saveEdit(): void {
    const content = this.editForm.get('editContent')?.value?.trim();
    if (content && content !== this.message.content) {
      this.edit.emit({ id: this.message.id, content });
    }
    this.isEditing.set(false);
    this.editForm.reset();
  }

  onDelete(): void {
    this.delete.emit(this.message.id);
  }

  getAvatarText(): string {
    return this.message.sender.name.charAt(0).toUpperCase();
  }

  getMessageClasses(): string {
    const classes = ['chat-message'];
    if (this.isCurrentUser()) classes.push('current-user');
    if (this.isAssistant()) classes.push('assistant');
    if (this.isSystem()) classes.push('system');
    return classes.join(' ');
  }
}