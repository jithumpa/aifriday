import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ChatResponse } from '../../models/api.models';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: { tool: string; arguments: Record<string, unknown> }[];
    iterations?: number;
    timestamp: Date;
}

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="chat-page" [class.has-messages]="messages.length > 0">

      <!-- Welcome screen (no messages yet) -->
      <div class="welcome" *ngIf="messages.length === 0">
        <h1>GovernIQ Chat</h1>
      </div>

      <!-- Chat Messages -->
      <div class="messages" #messagesContainer *ngIf="messages.length > 0">
        <div *ngFor="let msg of messages" 
             class="message" 
             [class.user]="msg.role === 'user'"
             [class.assistant]="msg.role === 'assistant'">
          <div class="message-avatar">
            <span class="material-icons">{{ msg.role === 'user' ? 'person' : 'smart_toy' }}</span>
          </div>
          <div class="message-content">
            <div class="message-text" [innerHTML]="renderMarkdown(msg.content)"></div>
            <div class="message-meta">
              <span>{{ msg.timestamp | date:'shortTime' }}</span>
              <span *ngIf="msg.iterations">· {{ msg.iterations }} iterations</span>
              <span *ngIf="msg.toolCalls?.length">· {{ msg.toolCalls?.length }} tools used</span>
            </div>
            <div class="tool-calls-mini" *ngIf="msg.toolCalls?.length">
              <span *ngFor="let tc of msg.toolCalls" class="tool-chip">{{ tc.tool }}</span>
            </div>
          </div>
        </div>
        
        <!-- Typing indicator -->
        <div class="message assistant" *ngIf="loading">
          <div class="message-avatar">
            <span class="material-icons">smart_toy</span>
          </div>
          <div class="message-content">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>

      <!-- Input bar (always visible at bottom) -->
      <div class="input-bar">
        <div class="input-wrapper">
          <textarea 
            class="chat-input"
            [(ngModel)]="inputText"
            (keydown)="onKeyDown($event)"
            placeholder="Ask GovernIQ anything..."
            rows="1"
            [disabled]="loading"
          ></textarea>
          <button class="send-btn" (click)="sendMessage()" [disabled]="!inputText.trim() || loading">
            <span class="material-icons">arrow_upward</span>
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .chat-page {
      max-width: 820px;
      margin: 0 auto;
      height: calc(100vh - 48px);
      display: flex;
      flex-direction: column;
      padding: 0 16px;
    }
    
    /* ── Welcome (empty state) ── */
    .welcome {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      
      h1 {
        font-size: 36px;
        font-weight: 700;
        color: var(--gray-800, #1f2937);
        letter-spacing: -0.5px;
      }
    }
    
    /* ── Messages ── */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 32px 0 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    .message {
      display: flex;
      gap: 12px;
      max-width: 90%;
      
      &.user {
        align-self: flex-end;
        flex-direction: row-reverse;
        
        .message-avatar { background: var(--primary, #2563eb); }
        .message-content {
          background: var(--primary, #2563eb);
          color: white;
          border-radius: 20px 20px 4px 20px;
        }
        .message-meta { text-align: right; color: rgba(255,255,255,0.7); }
      }
      
      &.assistant {
        align-self: flex-start;
        
        .message-avatar { background: linear-gradient(135deg, #10b981, #059669); }
        .message-content {
          background: #f7f7f8;
          border-radius: 20px 20px 20px 4px;
        }
      }
    }
    
    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      .material-icons { font-size: 18px; color: white; }
    }
    
    .message-content {
      padding: 12px 16px;
      
      .message-text {
        line-height: 1.6;
        font-size: 15px;
        h1, h2, h3 { margin: 12px 0 8px; }
        ul, ol { padding-left: 20px; margin: 8px 0; }
        li { margin: 4px 0; }
        strong { font-weight: 600; }
        code { background: rgba(0,0,0,0.06); padding: 2px 5px; border-radius: 4px; font-size: 13px; }
      }
    }
    
    .message-meta {
      font-size: 11px;
      color: var(--gray-400, #9ca3af);
      margin-top: 6px;
      display: flex;
      gap: 6px;
    }
    
    .tool-calls-mini {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
    }
    .tool-chip {
      font-size: 11px; padding: 2px 8px;
      background: rgba(59,130,246,0.1); color: var(--primary, #2563eb);
      border-radius: 10px;
    }
    
    .typing-indicator {
      display: flex; gap: 4px; padding: 8px 0;
      span {
        width: 8px; height: 8px; background: var(--gray-400, #9ca3af);
        border-radius: 50%; animation: bounce 1.4s infinite ease-in-out;
        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
      }
    }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    /* ── Input bar ── */
    .input-bar {
      padding: 16px 0 24px;
    }
    
    .input-wrapper {
      display: flex;
      align-items: flex-end;
      background: #f4f4f4;
      border: 1px solid #e0e0e0;
      border-radius: 26px;
      padding: 6px 6px 6px 20px;
      transition: border-color 0.2s, box-shadow 0.2s;
      
      &:focus-within {
        border-color: var(--primary, #2563eb);
        box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        background: white;
      }
    }
    
    .chat-input {
      flex: 1;
      border: none;
      background: transparent;
      resize: none;
      font-size: 15px;
      line-height: 1.5;
      padding: 8px 0;
      max-height: 150px;
      
      &:focus { outline: none; }
      &::placeholder { color: #aaa; }
    }
    
    .send-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary, #2563eb);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
      
      .material-icons { color: white; font-size: 20px; }
      
      &:hover:not(:disabled) { background: #1d4ed8; }
      &:disabled { background: #d1d5db; cursor: not-allowed; }
    }
  `]
})
export class ChatComponent implements OnInit {
    messages: ChatMessage[] = [];
    inputText = '';
    loading = false;

    constructor(
        private api: ApiService,
        private route: ActivatedRoute
    ) { }

    ngOnInit() {
        // Check for query param
        this.route.queryParams.subscribe(params => {
            if (params['query']) {
                this.askQuestion(decodeURIComponent(params['query']));
            }
        });
    }

    askQuestion(question: string) {
        this.inputText = question;
        this.sendMessage();
    }

    onKeyDown(event: Event) {
        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    sendMessage() {
        const text = this.inputText.trim();
        if (!text || this.loading) return;

        // Add user message
        this.messages.push({
            role: 'user',
            content: text,
            timestamp: new Date()
        });

        this.inputText = '';
        this.loading = true;

        // Call API
        this.api.chat(text).subscribe({
            next: (res: ChatResponse) => {
                this.messages.push({
                    role: 'assistant',
                    content: res.response,
                    toolCalls: res.tool_calls,
                    iterations: res.iterations,
                    timestamp: new Date()
                });
                this.loading = false;
                this.scrollToBottom();
            },
            error: (err) => {
                this.messages.push({
                    role: 'assistant',
                    content: `❌ Error: ${err.error?.detail || err.error?.response || 'Failed to get response. Make sure the API is running and OPENAI_API_KEY is set.'}`,
                    timestamp: new Date()
                });
                this.loading = false;
            }
        });
    }

    renderMarkdown(text: string): string {
        if (!text) return '';
        return text
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = document.querySelector('.messages');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 100);
    }
}
