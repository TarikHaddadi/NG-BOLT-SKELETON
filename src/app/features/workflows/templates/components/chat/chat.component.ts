import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  effect,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppSelectors } from '@cadai/pxs-ng-core/store';
import {
  ChatMessage,
  ChatSender,
  ChatConfig,
  ChatMode,
  ChatEndpoints,
} from '../../../utils/chatTpl.interface';
import { ChatMessageComponent } from './chatMessage/chatMessage.component';
import { ChatInputComponent } from './chatInput/chatInput.component';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat-tpl',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ChatMessageComponent,
    ChatInputComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private chatService = inject(ChatService);
  private destroy$ = new Subject<void>();

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  // Inputs
  @Input() set mode(value: ChatMode) {
    this._mode.set(value);
    if (value.mode === 'preloaded' && value.messages) {
      this._messages.set(value.messages);
    }
  }

  @Input() set config(value: Partial<ChatConfig>) {
    this._config.set({ ...this.defaultConfig, ...value });
  }

  @Input() set currentUser(value: ChatSender) {
    this._currentUser.set(value);
  }
  
  get currentUser() {
    return this._currentUser();
  }

  @Input() set initialMessages(value: ChatMessage[]) {
    if (value && value.length > 0) {
      this._messages.set(value);
    }
  }

  @Input() set endpoints(value: Partial<ChatEndpoints>) {
    this._endpoints.set(value);
  }

  @Input() disabled = false;
  @Input() loading = false;
  @Input() typing = false;
  @Input() useMockData = true;

  // Outputs
  @Output() messageSent = new EventEmitter<string>();
  @Output() messageDeleted = new EventEmitter<string>();
  @Output() messageEdited = new EventEmitter<{ id: string; content: string }>();
  @Output() chatCleared = new EventEmitter<void>();
  @Output() errorEmitter = new EventEmitter<Error>();

  // Signals
  private _mode = signal<ChatMode>({ mode: 'interactive' });
  private _config = signal<ChatConfig>(this.defaultConfig);
  private _messages = signal<ChatMessage[]>([]);
  private _currentUser = signal<ChatSender>(this.defaultUser);
  private _endpoints = signal<Partial<ChatEndpoints>>({});
  private _isTyping = signal<boolean>(false);
  private _isLoading = signal<boolean>(false);

  // Computed
  mode$ = computed(() => this._mode());
  config$ = computed(() => this._config());
  messages$ = computed(() => this._messages());
  currentUser$ = computed(() => this._currentUser());
  endpoints$ = computed(() => this._endpoints());
  isTyping$ = computed(() => this._isTyping());
  isLoading$ = computed(() => this._isLoading());

  isPreloadedMode$ = computed(() => this._mode().mode === 'preloaded');

  canSendMessage$ = computed(() => {
    const isLoading = this._isLoading();
    const isTyping = this._isTyping();
    const disabled = this.disabled;

    return !isLoading && !isTyping && !disabled;
  });

  canEditDelete$ = computed(() => {
    const mode = this._mode();
    const config = this._config();

    if (mode.mode === 'preloaded') {
      return config.allowEdit !== false && config.allowDelete !== false;
    }

    return true;
  });


  isDark$!: Observable<boolean>;
  lang$!: Observable<string>;

  private get defaultConfig(): ChatConfig {
    return {
      showTimestamps: true,
      showAvatars: true,
      allowMarkdown: true,
      allowEdit: true,
      allowDelete: true,
      maxLength: 4000,
      placeholder: 'chatTpl.placeholder',
      emptyStateMessage: 'chatTpl.emptyState',
      enableAttachments: false,
      autoScroll: true,
    };
  }

  private get defaultUser(): ChatSender {
    return {
      id: 'user-1',
      name: 'You',
      type: 'user',
    };
  }

  constructor() {
    effect(() => {
      const messages = this._messages();
      const config = this._config();

      if (config.autoScroll && messages.length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    effect(() => {
      this.typing = this._isTyping();
    });

    effect(() => {
      this.loading = this._isLoading();
    });
  }

  ngOnInit(): void {
    this.isDark$ = this.store.select(AppSelectors.ThemeSelectors.selectIsDark);
    this.lang$ = this.store.select(AppSelectors.LangSelectors.selectLang);

    // Configure service
    this.chatService.configure({
      useMockData: this.useMockData,
      endpoints: this._endpoints(),
    });

    // Initialize with welcome message if empty and in interactive mode
    if (this._messages().length === 0 && this._mode().mode === 'interactive') {
      this.addWelcomeMessage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isEmpty(): boolean {
    return this._messages().length === 0;
  }

  /**
   * Send message using service
   */
  onSendMessage(content: string): void {
    if (!this.canSendMessage$()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      content,
      sender: this._currentUser(),
      timestamp: new Date(),
    };

    // Add user message immediately
    this._messages.update(msgs => [...msgs, userMessage]);
    this.messageSent.emit(content);

    // Set typing indicator
    this._isTyping.set(true);

    // Call service to send message
    this.chatService
      .sendMessage(
        {
          content,
          sender: this._currentUser(),
        },
        this._endpoints()
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this._isTyping.set(false);
          // Add assistant response
          this._messages.update(msgs => [...msgs, response.assistantMessage]);
        },
        error: err => {
          this._isTyping.set(false);
          console.error('Error sending message:', err);
          this.errorEmitter.emit(err);
        },
      });
  }

  /**
   * Delete message using service
   */
  onDeleteMessage(messageId: string): void {
    if (!this.canEditDelete$()) {
      console.warn('Message deletion is disabled in current mode');
      return;
    }

    this.chatService
      .deleteMessage(messageId, this._endpoints())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.success) {
            this._messages.update(msgs => msgs.filter(m => m.id !== messageId));
            this.messageDeleted.emit(messageId);
          }
        },
        error: err => {
          console.error('Error deleting message:', err);
          this.errorEmitter.emit(err);
        },
      });
  }

  /**
   * Edit message using service
   */
  onEditMessage(id: string, content: string): void {
    if (!this.canEditDelete$()) {
      console.warn('Message editing is disabled in current mode');
      return;
    }

    this.chatService
      .editMessage(id, content, this._endpoints())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updatedMessage => {
          this._messages.update(msgs =>
            msgs.map(m => (m.id === id ? { ...m, ...updatedMessage, edited: true } : m))
          );
          this.messageEdited.emit({ id, content });
        },
        error: err => {
          console.error('Error editing message:', err);
          this.errorEmitter.emit(err);
        },
      });
  }

  clearChat(): void {
    this._messages.set([]);
    this.chatCleared.emit();

    if (this._mode().mode === 'interactive') {
      this.addWelcomeMessage();
    }
  }

  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const newMessage: ChatMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
    };

    this._messages.update(msgs => [...msgs, newMessage]);
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: ChatMessage = {
      id: this.generateMessageId(),
      content: 'Hello! How can I help you today?',
      sender: {
        id: 'assistant',
        name: 'Assistant',
        type: 'assistant',
      },
      timestamp: new Date(),
    };

    this._messages.set([welcomeMessage]);
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }
}