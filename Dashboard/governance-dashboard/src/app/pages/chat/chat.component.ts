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
    <div class="chat-page">
      <header class="page-header">
        <div>
          <h1>🤖 AI Governance Agent</h1>
          <p>Ask questions about your sustainability and DEI data</p>
        </div>
      </header>

      <!-- Suggested Questions -->
      <div class="suggestions" *ngIf="messages.length === 0">
        <h3>Try asking:</h3>
        <div class="suggestion-chips">
          <button *ngFor="let q of suggestedQuestions" (click)="askQuestion(q)">
            {{ q }}
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="chat-container">
        <div class="messages" #messagesContainer>
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
                <span *ngIf="msg.iterations">• {{ msg.iterations }} iterations</span>
                <span *ngIf="msg.toolCalls?.length">• {{ msg.toolCalls?.length }} tools used</span>
              </div>
              <!-- Tool calls display -->
              <div class="tool-calls-mini" *ngIf="msg.toolCalls?.length">
                <span *ngFor="let tc of msg.toolCalls" class="tool-chip">
                  {{ tc.tool }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Loading indicator -->
          <div class="message assistant" *ngIf="loading">
            <div class="message-avatar">
              <span class="material-icons">smart_toy</span>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <div class="message-meta">Thinking...</div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="input-wrapper">
            <textarea 
              class="chat-input"
              [(ngModel)]="inputText"
              (keydown)="onKeyDown($event)"
              placeholder="Ask about ESG metrics, initiatives, trends, or anomalies..."
              rows="1"
              [disabled]="loading"
            ></textarea>
            <button class="send-btn" (click)="sendMessage()" [disabled]="!inputText.trim() || loading">
              <span class="material-icons">send</span>
            </button>
          </div>
          <p class="input-hint">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions-bar">
        <button (click)="askQuestion('Detect anomalies in the metrics data')">
          <span class="material-icons">troubleshoot</span>
          Detect Anomalies
        </button>
        <button (click)="askQuestion('What are the overdue initiatives?')">
          <span class="material-icons">warning</span>
          Overdue Items
        </button>
        <button (click)="askQuestion('Show me ESG metric trends')">
          <span class="material-icons">trending_up</span>
          ESG Trends
        </button>
        <button (click)="askQuestion('Summarize DEI performance')">
          <span class="material-icons">diversity_3</span>
          DEI Summary
        </button>
      </div>
    </div>
  `,
    styles: [`
    .chat-page {
      max-width: 900px;
      margin: 0 auto;
      height: calc(100vh - 48px);
      display: flex;
      flex-direction: column;
    }
    
    .page-header {
      margin-bottom: 24px;
      
      h1 { font-size: 28px; font-weight: 700; }
      p { color: var(--gray-500); margin-top: 4px; }
    }
    
    .suggestions {
      background: white;
      border-radius: var(--radius-lg);
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
      
      h3 {
        font-size: 14px;
        color: var(--gray-500);
        margin-bottom: 16px;
      }
    }
    
    .suggestion-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      
      button {
        padding: 10px 16px;
        background: var(--gray-50);
        border: 1px solid var(--gray-200);
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        
        &:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      }
    }
    
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .message {
      display: flex;
      gap: 12px;
      max-width: 85%;
      
      &.user {
        align-self: flex-end;
        flex-direction: row-reverse;
        
        .message-avatar {
          background: var(--primary);
        }
        
        .message-content {
          background: var(--primary);
          color: white;
          border-radius: 18px 18px 4px 18px;
        }
        
        .message-meta {
          text-align: right;
          color: rgba(255,255,255,0.7);
        }
      }
      
      &.assistant {
        align-self: flex-start;
        
        .message-avatar {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .message-content {
          background: var(--gray-50);
          border-radius: 18px 18px 18px 4px;
        }
      }
    }
    
    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      .material-icons {
        font-size: 20px;
        color: white;
      }
    }
    
    .message-content {
      padding: 12px 16px;
      
      .message-text {
        line-height: 1.5;
        
        h1, h2, h3 { margin: 12px 0 8px; }
        ul, ol { padding-left: 20px; margin: 8px 0; }
        li { margin: 4px 0; }
        strong { font-weight: 600; }
      }
    }
    
    .message-meta {
      font-size: 11px;
      color: var(--gray-400);
      margin-top: 8px;
      display: flex;
      gap: 8px;
    }
    
    .tool-calls-mini {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    
    .tool-chip {
      font-size: 11px;
      padding: 2px 8px;
      background: rgba(59, 130, 246, 0.1);
      color: var(--primary);
      border-radius: 10px;
    }
    
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 8px 0;
      
      span {
        width: 8px;
        height: 8px;
        background: var(--gray-400);
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
        
        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
      }
    }
    
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    .input-area {
      padding: 16px 24px;
      border-top: 1px solid var(--gray-100);
    }
    
    .input-wrapper {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }
    
    .chat-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid var(--gray-300);
      border-radius: 24px;
      resize: none;
      font-size: 14px;
      line-height: 1.5;
      max-height: 120px;
      
      &:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
    }
    
    .send-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--primary);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      
      .material-icons {
        color: white;
        font-size: 20px;
      }
      
      &:hover:not(:disabled) {
        background: var(--primary-dark);
        transform: scale(1.05);
      }
      
      &:disabled {
        background: var(--gray-300);
        cursor: not-allowed;
      }
    }
    
    .input-hint {
      font-size: 11px;
      color: var(--gray-400);
      margin-top: 8px;
      text-align: center;
    }
    
    .quick-actions-bar {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      padding: 16px;
      background: white;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
      
      button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        background: var(--gray-50);
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
        
        .material-icons {
          font-size: 18px;
          color: var(--primary);
        }
        
        &:hover {
          background: white;
          border-color: var(--primary);
        }
      }
    }
  `]
})
export class ChatComponent implements OnInit {
    messages: ChatMessage[] = [];
    inputText = '';
    loading = false;

    suggestedQuestions = [
        'What are the top ESG risks this week?',
        'Show me overdue initiatives',
        'Analyze DEI trends for Global',
        'Why is INIT-2 at risk?',
        'What decisions need executive attention?',
        'Detect any anomalies in metrics'
    ];

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
