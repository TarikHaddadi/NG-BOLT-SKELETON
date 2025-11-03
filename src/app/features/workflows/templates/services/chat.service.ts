import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
    ChatMessage, ChatEndpoints,
    ChatSendRequest,
    ChatSendResponse,
    ChatMessagesResponse
} from '../../utils/chatTpl.interface';


@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private http = inject(HttpClient);

    // Default endpoints (can be overridden)
    private defaultEndpoints: ChatEndpoints = {
        sendMessage: '/api/chat/send',
        getMessages: '/api/chat/messages',
        deleteMessage: '/api/chat/message',
        editMessage: '/api/chat/message',
        clearChat: '/api/chat/clear',
    };

    // Use mock data by default (set to false for production)
    private useMockData = true;

    /**
     * Configure service
     */
    configure(config: { useMockData?: boolean; endpoints?: Partial<ChatEndpoints> }): void {
        if (config.useMockData !== undefined) {
            this.useMockData = config.useMockData;
        }
        if (config.endpoints) {
            this.defaultEndpoints = { ...this.defaultEndpoints, ...config.endpoints };
        }
    }

    /**
     * Send a message and get response
     */
    sendMessage(
        request: ChatSendRequest,
        endpoints?: Partial<ChatEndpoints>
    ): Observable<ChatSendResponse> {
        const url = endpoints?.sendMessage || this.defaultEndpoints.sendMessage;

        if (this.useMockData) {
            return this.mockSendMessage(request);
        }

        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this.http.post<ChatSendResponse>(url, request, { headers }).pipe(
            tap(response => console.log('Chat message sent:', response)),
            catchError(error => {
                console.error('Error sending message:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Get chat messages (with pagination)
     */
    getMessages(
        chatId: string,
        options?: { limit?: number; offset?: number },
        endpoints?: Partial<ChatEndpoints>
    ): Observable<ChatMessagesResponse> {
        const url = endpoints?.getMessages || this.defaultEndpoints.getMessages;

        if (this.useMockData) {
            return this.mockGetMessages(chatId, options);
        }

        const params: Record<string, string> = { chatId };
        if (options?.limit) params['limit'] = options.limit.toString();
        if (options?.offset) params['offset'] = options.offset.toString();

        return this.http.get<ChatMessagesResponse>(url, { params }).pipe(
            tap(response => console.log('Chat messages loaded:', response)),
            catchError(error => {
                console.error('Error loading messages:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Delete a message
     */
    deleteMessage(
        messageId: string,
        endpoints?: Partial<ChatEndpoints>
    ): Observable<{ success: boolean; messageId: string }> {
        const url = `${endpoints?.deleteMessage || this.defaultEndpoints.deleteMessage}/${messageId}`;

        if (this.useMockData) {
            return this.mockDeleteMessage(messageId);
        }

        return this.http.delete<{ success: boolean; messageId: string }>(url).pipe(
            tap(response => console.log('Message deleted:', response)),
            catchError(error => {
                console.error('Error deleting message:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Edit a message
     */
    editMessage(
        messageId: string,
        newContent: string,
        endpoints?: Partial<ChatEndpoints>
    ): Observable<ChatMessage> {
        const url = `${endpoints?.editMessage || this.defaultEndpoints.editMessage}/${messageId}`;

        if (this.useMockData) {
            return this.mockEditMessage(messageId, newContent);
        }

        const body = { content: newContent };

        return this.http.patch<ChatMessage>(url, body).pipe(
            tap(response => console.log('Message edited:', response)),
            catchError(error => {
                console.error('Error editing message:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Clear chat history
     */
    clearChat(
        chatId: string,
        endpoints?: Partial<ChatEndpoints>
    ): Observable<{ success: boolean; chatId: string }> {
        const url = `${endpoints?.clearChat || this.defaultEndpoints.clearChat}/${chatId}`;

        if (this.useMockData) {
            return this.mockClearChat(chatId);
        }

        return this.http.delete<{ success: boolean; chatId: string }>(url).pipe(
            tap(response => console.log('Chat cleared:', response)),
            catchError(error => {
                console.error('Error clearing chat:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Generate bot response (AI integration point)
     */
    generateResponse(userMessage: string): Observable<string> {
        if (this.useMockData) {
            return this.mockGenerateResponse(userMessage);
        }

        // TODO: Integrate with actual AI service (OpenAI, Azure OpenAI, etc.)
        return of(this.generateMockBotResponse(userMessage)).pipe(delay(1500));
    }

    // ============================================================================
    // MOCK DATA METHODS
    // ============================================================================


    private mockSendMessage(request: ChatSendRequest): Observable<ChatSendResponse> {
        const userMessage: ChatMessage = {
            id: this.generateId(),
            content: request.content,
            sender: request.sender,
            timestamp: new Date(),
            metadata: request.metadata,
        };

        const assistantMessage: ChatMessage = {
            id: this.generateId(),
            content: this.generateMockBotResponse(request.content),
            sender: {
                id: 'assistant',
                name: 'AI Assistant',
                type: 'assistant' as const,
            },
            timestamp: new Date(),
        };

        return of({
            userMessage,
            assistantMessage,
            timestamp: new Date(),
        }).pipe(delay(1500));
    }


    private mockGetMessages(
        chatId: string,
        options?: { limit?: number; offset?: number }
    ): Observable<ChatMessagesResponse> {
        const mockMessages = this.generateMockMessages();
        const limit = options?.limit || 50;
        const offset = options?.offset || 0;

        const paginatedMessages = mockMessages.slice(offset, offset + limit);

        return of({
            messages: paginatedMessages,
            total: mockMessages.length,
            hasMore: offset + limit < mockMessages.length,
        }).pipe(delay(500));
    }

    private mockDeleteMessage(messageId: string): Observable<{ success: boolean; messageId: string }> {
        return of({
            success: true,
            messageId,
        }).pipe(delay(300));
    }

    private mockEditMessage(messageId: string, newContent: string): Observable<ChatMessage> {
        return of({
            id: messageId,
            content: newContent,
            sender: {
                id: 'user-1',
                name: 'You',
                type: 'user' as const,
            },
            timestamp: new Date(),
            edited: true,
        }).pipe(delay(300));
    }


    private mockClearChat(chatId: string): Observable<{ success: boolean; chatId: string }> {
        return of({
            success: true,
            chatId,
        }).pipe(delay(300));
    }

    private mockGenerateResponse(userMessage: string): Observable<string> {
        return of(this.generateMockBotResponse(userMessage)).pipe(delay(1500));
    }

    private generateMockBotResponse(userMessage: string): string {
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return 'Hello! How can I assist you today?';
        } else if (lowerMessage.includes('help')) {
            return "I'm here to help! You can ask me questions or request assistance with various tasks.";
        } else if (lowerMessage.includes('thank')) {
            return "You're welcome! Is there anything else I can help you with?";
        } else if (lowerMessage.includes('bye')) {
            return 'Goodbye! Feel free to return if you need more assistance.';
        } else if (lowerMessage.includes('document') || lowerMessage.includes('file')) {
            return 'I can help you analyze documents, compare files, or summarize content. What would you like to do?';
        } else if (lowerMessage.includes('compare')) {
            return 'To compare documents, please upload two files and I will identify the key differences for you.';
        } else if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
            return 'I can create summaries in different styles and lengths. Would you like an executive summary, a detailed analysis, or quick bullet points?';
        } else {
            return `I understand you said: "${userMessage}". Could you provide more details about what you need help with?`;
        }
    }


    private generateMockMessages(): ChatMessage[] {
        return [
            {
                id: 'msg-1',
                content: 'Hello! I need help analyzing some documents.',
                sender: { id: 'user-1', name: 'John Doe', type: 'user' as const },
                timestamp: new Date('2025-11-03T10:00:00'),
            },
            {
                id: 'msg-2',
                content: "Hello! I'd be happy to help you analyze documents. What would you like to do?",
                sender: { id: 'assistant', name: 'AI Assistant', type: 'assistant' as const },
                timestamp: new Date('2025-11-03T10:00:15'),
            },
            {
                id: 'msg-3',
                content: 'I want to compare two contract versions and see what changed.',
                sender: { id: 'user-1', name: 'John Doe', type: 'user' as const },
                timestamp: new Date('2025-11-03T10:01:00'),
            },
            {
                id: 'msg-4',
                content:
                    'Perfect! Please upload both contract versions, and I will identify all the differences for you.',
                sender: { id: 'assistant', name: 'AI Assistant', type: 'assistant' as const },
                timestamp: new Date('2025-11-03T10:01:20'),
            },
        ];
    }
    
    private generateId(): string {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}