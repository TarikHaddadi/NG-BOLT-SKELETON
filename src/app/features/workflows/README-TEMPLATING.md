# Workflow Templates Usage Guide

## Overview

This guide explains how to use the three main workflow template components in both **Upload Mode** (interactive) and **Preloaded Mode** (display-only). Each component supports both modes for maximum flexibility.

---

## 📋 Available Components

1. **Chat Component** - AI-powered conversational interface
2. **Compare Component** - Document comparison with diff visualization
3. **Summarize Component** - Multi-document summarization with export

---

## 🎯 Understanding the Two Modes

### Upload Mode (Interactive)
- Users upload files and interact with the component
- Real-time processing and feedback
- Progress tracking and error handling
- Event emitters for parent component integration

### Preloaded Mode (Display Only)
- Results provided from parent component or backend
- Read-only result visualization
- Perfect for workflow nodes and saved results
- No upload or processing capabilities

---

## 1️⃣ Chat Component

### 📍 Import Path
```typescript
import { ChatComponent } from '@features/workflows/templates/chat/chat.component';
import { ChatMessage, ChatConfig } from '@features/workflows/utils/chatTpl.interface';
```

### 🔧 Upload Mode (Interactive Chat)

**Use Case**: Live conversation with AI, user sends messages and receives responses

```typescript
import { Component, signal } from '@angular/core';
import { ChatComponent } from '@features/workflows/templates/chat/chat.component';
import { ChatMessage, ChatConfig } from '@features/workflows/utils/chatTpl.interface';

@Component({
  selector: 'app-interactive-chat',
  standalone: true,
  imports: [ChatComponent],
  template: `
    <app-chat
      [messages]="messages()"
      [config]="chatConfig"
      [loading]="loading()"
      [typing]="typing()"
      [currentUser]="currentUser"
      (messageSent)="onMessageSent($event)"
      (messageDeleted)="onMessageDeleted($event)"
      (messageEdited)="onMessageEdited($event)"
    />
  `
})
export class InteractiveChatComponent {
  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  typing = signal(false);
  
  currentUser = {
    id: 'user-123',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg'
  };

  chatConfig: ChatConfig = {
    allowFileUpload: true,
    allowMarkdown: true,
    maxMessageLength: 2000,
    placeholder: 'Type your message...',
    sendEndpoint: '/api/chat/send',
    uploadEndpoint: '/api/chat/upload'
  };

  onMessageSent(content: string): void {
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content,
      sender: this.currentUser,
      timestamp: new Date(),
      type: 'text'
    };
    this.messages.update(msgs => [...msgs, userMessage]);

    // Send to backend and wait for AI response
    this.loading.set(true);
    this.typing.set(true);
    
    // Simulate API call
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        content: 'This is an AI response to: ' + content,
        sender: { id: 'ai', name: 'AI Assistant', avatar: '' },
        timestamp: new Date(),
        type: 'text'
      };
      this.messages.update(msgs => [...msgs, aiResponse]);
      this.loading.set(false);
      this.typing.set(false);
    }, 2000);
  }

  onMessageDeleted(messageId: string): void {
    this.messages.update(msgs => msgs.filter(m => m.id !== messageId));
  }

  onMessageEdited(event: { id: string; content: string }): void {
    this.messages.update(msgs => 
      msgs.map(m => m.id === event.id ? { ...m, content: event.content } : m)
    );
  }
}
```

### 📄 Preloaded Mode (Display Chat History)

**Use Case**: Display saved conversation, workflow results, chat history

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatComponent } from '@features/workflows/templates/chat/chat.component';
import { ChatMessage } from '@features/workflows/utils/chatTpl.interface';

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [ChatComponent],
  template: `
    @if (messages) {
      <app-chat
        [messages]="messages"
        [config]="{ readOnly: true }"
        [currentUser]="currentUser"
      />
    } @else {
      <p>Loading conversation...</p>
    }
  `
})
export class ChatHistoryComponent implements OnInit {
  private http = inject(HttpClient);
  messages?: ChatMessage[];
  
  currentUser = {
    id: 'user-123',
    name: 'John Doe',
    avatar: ''
  };

  ngOnInit(): void {
    // Fetch saved conversation from backend
    this.http.get<ChatMessage[]>('/api/chat/conversation/conv-456')
      .subscribe(messages => {
        this.messages = messages;
      });
  }
}

// Example: Hardcoded preloaded messages
export class ChatPreloadedExample {
  messages: ChatMessage[] = [
    {
      id: 'msg-1',
      content: 'Hello! How can I help you today?',
      sender: { id: 'ai', name: 'AI Assistant', avatar: '' },
      timestamp: new Date('2025-10-20T10:00:00'),
      type: 'text'
    },
    {
      id: 'msg-2',
      content: 'I need help with document analysis',
      sender: { id: 'user-123', name: 'John Doe', avatar: '' },
      timestamp: new Date('2025-10-20T10:00:30'),
      type: 'text'
    },
    {
      id: 'msg-3',
      content: 'I can help you analyze documents. Please upload a file.',
      sender: { id: 'ai', name: 'AI Assistant', avatar: '' },
      timestamp: new Date('2025-10-20T10:00:45'),
      type: 'text'
    }
  ];
}
```

### 🔑 Chat Component API

**Input Properties:**
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `messages` | `ChatMessage[]` | ✅ | Array of chat messages |
| `config` | `ChatConfig` | ❌ | Configuration options |
| `loading` | `boolean` | ❌ | Show loading indicator |
| `typing` | `boolean` | ❌ | Show typing indicator |
| `currentUser` | `User` | ✅ | Current user information |

**Output Events (Upload Mode Only):**
| Event | Payload | Description |
|-------|---------|-------------|
| `messageSent` | `string` | User sent a message |
| `messageDeleted` | `string` | User deleted a message |
| `messageEdited` | `{ id: string; content: string }` | User edited a message |

---

## 2️⃣ Compare Component

### 📍 Import Path
```typescript
import { CompareComponent } from '@features/workflows/templates/compare/compare.component';
import { CompareConfig, ComparisonResult, CompareFile } from '@features/workflows/utils/compareTpl.interface';
```

### 🔧 Upload Mode (Interactive Comparison)

**Use Case**: Users upload two documents and trigger comparison

```typescript
import { Component } from '@angular/core';
import { CompareComponent } from '@features/workflows/templates/compare/compare.component';
import { CompareConfig, ComparisonResult, CompareFile } from '@features/workflows/utils/compareTpl.interface';

@Component({
  selector: 'app-document-compare',
  standalone: true,
  imports: [CompareComponent],
  template: `
    <app-compare
      [mode]="{ mode: 'upload' }"
      [config]="compareConfig"
      (fileUploaded)="onFileUploaded($event)"
      (comparisonStarted)="onComparisonStarted()"
      (comparisonCompleted)="onComparisonCompleted($event)"
      (comparisonError)="onComparisonError($event)"
    />
  `
})
export class DocumentCompareComponent {
  compareConfig: CompareConfig = {
    allowedFileTypes: ['.pdf', '.docx', '.txt', '.json'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    showProgress: true,
    autoCompare: false, // Set true for auto-comparison when both files uploaded
    compareEndpoint: '/api/documents/compare',
    uploadEndpoint: '/api/documents/upload'
  };

  onFileUploaded(event: { slot: 1 | 2; file: CompareFile }): void {
    console.log(`File ${event.slot} uploaded:`, event.file.name);
  }

  onComparisonStarted(): void {
    console.log('Comparison started...');
  }

  onComparisonCompleted(result: ComparisonResult): void {
    console.log('Comparison completed:', result);
    console.log(`Similarity: ${result.similarity}%`);
    console.log(`Differences found: ${result.differences.length}`);
    
    // Save result or navigate to results page
  }

  onComparisonError(error: Error): void {
    console.error('Comparison failed:', error.message);
    // Show error notification to user
  }
}
```

### 📄 Preloaded Mode (Display Comparison Results)

**Use Case**: Display pre-computed comparison, workflow node results

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { CompareComponent } from '@features/workflows/templates/compare/compare.component';
import { ComparisonResult } from '@features/workflows/utils/compareTpl.interface';

@Component({
  selector: 'app-comparison-results',
  standalone: true,
  imports: [CompareComponent],
  template: `
    @if (comparisonResult) {
      <app-compare
        [mode]="{ mode: 'preloaded', result: comparisonResult }"
      />
    } @else {
      <p>Loading comparison results...</p>
    }
  `
})
export class ComparisonResultsComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  comparisonResult?: ComparisonResult;

  ngOnInit(): void {
    const comparisonId = this.route.snapshot.paramMap.get('id');
    
    // Fetch from backend
    this.http.get<ComparisonResult>(`/api/comparisons/${comparisonId}`)
      .subscribe(result => {
        this.comparisonResult = result;
      });
  }
}

// Example: Hardcoded preloaded result
export class ComparePreloadedExample {
  preloadedResult: ComparisonResult = {
    id: 'comp-123',
    file1: {
      key: 'file-1-key',
      name: 'contract_v1.pdf',
      size: 2048576,
      ext: 'pdf',
      mime: 'application/pdf',
      url: 'https://storage.example.com/files/contract_v1.pdf',
      uploadDate: new Date('2025-01-15')
    },
    file2: {
      key: 'file-2-key',
      name: 'contract_v2.pdf',
      size: 2156789,
      ext: 'pdf',
      mime: 'application/pdf',
      url: 'https://storage.example.com/files/contract_v2.pdf',
      uploadDate: new Date('2025-01-20')
    },
    differences: [
      {
        id: 'diff-1',
        type: 'modified',
        section: 'Section 3: Payment Terms',
        file1Content: 'Payment due within 30 days',
        file2Content: 'Payment due within 45 days',
        lineNumber: 42,
        description: 'Payment term duration changed'
      }
    ],
    similarity: 87.5,
    status: 'completed',
    createdAt: new Date('2025-01-20T10:30:00'),
    completedAt: new Date('2025-01-20T10:30:45')
  };
}
```

### 🔑 Compare Component API

**Input Properties:**
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `mode` | `{ mode: 'upload' } \| { mode: 'preloaded'; result: ComparisonResult }` | ✅ | Operating mode |
| `config` | `CompareConfig` | ❌ | Configuration (upload mode only) |

**Output Events (Upload Mode Only):**
| Event | Payload | Description |
|-------|---------|-------------|
| `fileUploaded` | `{ slot: 1 \| 2; file: CompareFile }` | File uploaded successfully |
| `comparisonStarted` | `void` | Comparison process started |
| `comparisonCompleted` | `ComparisonResult` | Comparison finished |
| `comparisonError` | `Error` | Comparison failed |

---

## 3️⃣ Summarize Component

### 📍 Import Path
```typescript
import { SummarizeComponent } from '@features/workflows/templates/summarize/summarize.component';
import { SummarizeConfig, SummaryResult, SummarizeFile } from '@features/workflows/utils/summarizeTpl.interface';
```

### 🔧 Upload Mode (Interactive Summarization)

**Use Case**: Users upload documents, select options, and generate summaries

```typescript
import { Component } from '@angular/core';
import { SummarizeComponent } from '@features/workflows/templates/summarize/summarize.component';
import { SummarizeConfig, SummaryResult, SummarizeFile } from '@features/workflows/utils/summarizeTpl.interface';

@Component({
  selector: 'app-document-summarize',
  standalone: true,
  imports: [SummarizeComponent],
  template: `
    <app-summarize
      [mode]="{ mode: 'upload' }"
      [config]="summarizeConfig"
      (fileUploaded)="onFileUploaded($event)"
      (summarizeStarted)="onSummarizeStarted()"
      (summarizeCompleted)="onSummaryCompleted($event)"
      (summarizeError)="onError($event)"
    />
  `
})
export class DocumentSummarizeComponent {
  summarizeConfig: SummarizeConfig = {
    allowedFileTypes: ['.pdf', '.docx', '.txt', '.md', '.json'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    showProgress: true,
    autoSummarize: false, // Set true for auto-summarization
    defaultLength: 'medium',
    defaultStyle: 'paragraph',
    defaultLanguage: 'en',
    availableLanguages: [
      { label: 'English', value: 'en' },
      { label: 'French', value: 'fr' },
      { label: 'Dutch', value: 'nl' },
      { label: 'German', value: 'de' }
    ],
    summarizeEndpoint: '/api/summarize',
    uploadEndpoint: '/api/upload'
  };

  onFileUploaded(file: SummarizeFile): void {
    console.log('File uploaded:', file.name);
  }

  onSummarizeStarted(): void {
    console.log('Summarization started...');
  }

  onSummaryCompleted(result: SummaryResult): void {
    console.log('Summary completed:', result);
    console.log(`Summary: ${result.summary}`);
    console.log(`Key Points: ${result.keyPoints.length}`);
    console.log(`Word Reduction: ${result.wordCount.reduction}%`);
    
    // Save result or display notification
  }

  onError(error: Error): void {
    console.error('Summarization failed:', error.message);
    // Show error notification
  }
}
```

### 📄 Preloaded Mode (Display Summary Results)

**Use Case**: Display saved summaries, workflow node results, archived summaries

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { SummarizeComponent } from '@features/workflows/templates/summarize/summarize.component';
import { SummaryResult } from '@features/workflows/utils/summarizeTpl.interface';

@Component({
  selector: 'app-summary-viewer',
  standalone: true,
  imports: [SummarizeComponent],
  template: `
    @if (summaryResult) {
      <app-summarize
        [mode]="{ mode: 'preloaded', result: summaryResult }"
      />
    } @else {
      <p>Loading summary...</p>
    }
  `
})
export class SummaryViewerComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  summaryResult?: SummaryResult;

  ngOnInit(): void {
    const summaryId = this.route.snapshot.paramMap.get('id');
    
    // Fetch from backend
    this.http.get<SummaryResult>(`/api/summaries/${summaryId}`)
      .subscribe(result => {
        this.summaryResult = result;
      });
  }
}

// Example: Hardcoded preloaded summary
export class SummarizePreloadedExample {
  preloadedSummary: SummaryResult = {
    id: 'summary-456',
    files: [
      {
        key: 'file-1',
        name: 'quarterly-report.pdf',
        size: 2048576,
        ext: 'pdf',
        mime: 'application/pdf',
        url: 'https://storage.example.com/files/report.pdf',
        uploadDate: new Date('2025-10-15')
      },
      {
        key: 'file-2',
        name: 'financial-statement.docx',
        size: 1024000,
        ext: 'docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        url: 'https://storage.example.com/files/statement.docx',
        uploadDate: new Date('2025-10-16')
      }
    ],
    summary: `This quarterly report highlights significant growth across all departments. 
              Revenue increased by 25% compared to Q3. Key achievements include successful 
              product launches and market expansion in European markets.`,
    keyPoints: [
      'Revenue increased by 25% quarter-over-quarter',
      'Successful launch of 3 new products',
      'Market expansion into 5 European countries',
      'Customer satisfaction rating improved to 4.8/5',
      'Operating costs reduced by 12%'
    ],
    wordCount: {
      original: 5420,
      summary: 456,
      reduction: 91.6
    },
    style: 'executive',
    length: 'medium',
    language: 'en',
    status: 'completed',
    createdAt: new Date('2025-10-20T10:30:00'),
    completedAt: new Date('2025-10-20T10:31:15')
  };
}
```

### 🔑 Summarize Component API

**Input Properties:**
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `mode` | `{ mode: 'upload' } \| { mode: 'preloaded'; result: SummaryResult }` | ✅ | Operating mode |
| `config` | `SummarizeConfig` | ❌ | Configuration (upload mode only) |

**Output Events (Upload Mode Only):**
| Event | Payload | Description |
|-------|---------|-------------|
| `fileUploaded` | `SummarizeFile` | File uploaded successfully |
| `summarizeStarted` | `void` | Summarization started |
| `summarizeCompleted` | `SummaryResult` | Summarization finished |
| `summarizeError` | `Error` | Summarization failed |

---

## 🎯 Mode Selection Guide

### When to Use Upload Mode

✅ **Use Upload Mode when:**
- Users need to interact with the component
- Real-time processing is required
- You need event feedback (file uploads, errors, completion)
- Users select their own files/options
- Part of an interactive workflow

### When to Use Preloaded Mode

✅ **Use Preloaded Mode when:**
- Displaying saved/archived results
- Workflow node visualization
- Read-only result viewing
- Backend pre-computes the results
- No user interaction needed
- Embedding results in reports/dashboards

---

## 📦 Quick Reference Matrix

| Component | Upload Mode Use Case | Preloaded Mode Use Case |
|-----------|---------------------|------------------------|
| **Chat** | Live AI conversation | Display chat history |
| **Compare** | Upload 2 docs to compare | Show pre-computed comparison |
| **Summarize** | Upload docs to summarize | Show saved summary |

---

## 🔗 Integration Patterns

### Pattern 1: Workflow Node (Preloaded)

```typescript
@Component({
  selector: 'app-workflow-node',
  template: `
    <app-summarize [mode]="{ mode: 'preloaded', result: nodeData.summary }" />
  `
})
export class WorkflowNodeComponent {
  @Input() nodeData: any; // Provided by workflow engine
}
```

### Pattern 2: Interactive Page (Upload)

```typescript
@Component({
  selector: 'app-tools-page',
  template: `
    <app-compare
      [mode]="{ mode: 'upload' }"
      [config]="config"
      (comparisonCompleted)="saveResult($event)"
    />
  `
})
export class ToolsPageComponent {
  config = { autoCompare: true };
  
  saveResult(result: ComparisonResult) {
    // Save to backend
  }
}
```

### Pattern 3: Dynamic Mode Switching

```typescript
@Component({
  template: `
    <app-chat
      [messages]="messages()"
      [config]="mode() === 'upload' ? uploadConfig : { readOnly: true }"
      (messageSent)="mode() === 'upload' && handleMessage($event)"
    />
  `
})
export class DynamicChatComponent {
  mode = signal<'upload' | 'preloaded'>('upload');
  messages = signal<ChatMessage[]>([]);
  uploadConfig = { allowFileUpload: true };
}
```

---

## 📝 Best Practices

1. **Always handle errors** in Upload Mode with `*Error` events
2. **Show loading states** when fetching Preloaded Mode data
3. **Validate configurations** before passing to Upload Mode
4. **Cache Preloaded results** to avoid unnecessary API calls
5. **Use TypeScript interfaces** for type safety
6. **Test both modes** independently during development

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Module**: `@features/workflows/templates`