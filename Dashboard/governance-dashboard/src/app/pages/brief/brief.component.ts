import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { BriefResponse } from '../../models/api.models';

@Component({
    selector: 'app-brief',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="brief-page">
      <header class="page-header">
        <div>
          <h1>Weekly Executive Brief</h1>
          <p>Generate AI-powered or deterministic governance briefs</p>
        </div>
      </header>

      <!-- Brief Generator -->
      <div class="card generator-card">
        <div class="generator-form">
          <div class="form-group">
            <label>Week Start Date</label>
            <input type="date" class="input" [(ngModel)]="weekStart">
          </div>
          
          <div class="form-group">
            <label>Generation Mode</label>
            <div class="mode-toggle">
              <button [class.active]="!useAI" (click)="useAI = false">
                <span class="material-icons">rule</span>
                Deterministic
              </button>
              <button [class.active]="useAI" (click)="useAI = true">
                <span class="material-icons">auto_awesome</span>
                AI-Powered
              </button>
            </div>
            <p class="mode-description" *ngIf="!useAI">
              Rule-based analysis using predefined signals and thresholds
            </p>
            <p class="mode-description" *ngIf="useAI">
              GPT-4o analyzes data with multi-step reasoning and RAG
            </p>
          </div>
          
          <button class="btn btn-primary btn-large" (click)="generateBrief()" [disabled]="loading">
            <span class="spinner" *ngIf="loading"></span>
            <span class="material-icons" *ngIf="!loading">auto_awesome</span>
            {{ loading ? 'Generating...' : 'Generate Brief' }}
          </button>
        </div>
      </div>

      <!-- Generated Brief -->
      <div class="card brief-card" *ngIf="brief">
        <div class="brief-header">
          <div>
            <h3>Executive Brief</h3>
            <span class="badge" [class.badge-info]="brief.mode === 'deterministic'"
                  [class.badge-success]="brief.mode === 'ai'">
              {{ brief.mode === 'ai' ? '🤖 AI Generated' : '📊 Deterministic' }}
            </span>
          </div>
          <div class="brief-meta" *ngIf="brief.mode === 'ai'">
            <span>{{ brief.iterations }} iterations</span>
            <span>{{ brief.tool_calls?.length || 0 }} tool calls</span>
          </div>
        </div>
        
        <div class="brief-content markdown-content" [innerHTML]="renderMarkdown(brief.brief)"></div>
        
        <!-- Tool Calls (for AI briefs) -->
        <div class="tool-calls" *ngIf="brief.mode === 'ai' && brief.tool_calls?.length">
          <h4>🔧 Agent Tool Calls</h4>
          <div class="tool-call" *ngFor="let call of brief.tool_calls">
            <span class="tool-name">{{ call.tool }}</span>
            <span class="tool-args">{{ formatArgs(call.arguments) }}</span>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div class="card error-card" *ngIf="error">
        <span class="material-icons">error</span>
        <p>{{ error }}</p>
      </div>
    </div>
  `,
    styles: [`
    .brief-page {
      max-width: 1000px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 32px;
      
      h1 {
        font-size: 28px;
        font-weight: 700;
      }
      
      p {
        color: var(--gray-500);
        margin-top: 4px;
      }
    }
    
    .generator-card {
      margin-bottom: 24px;
    }
    
    .generator-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .form-group {
      label {
        display: block;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--gray-700);
      }
    }
    
    .mode-toggle {
      display: flex;
      gap: 12px;
      
      button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px;
        border: 2px solid var(--gray-200);
        border-radius: var(--radius);
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;
        
        .material-icons {
          font-size: 20px;
        }
        
        &:hover {
          border-color: var(--primary);
        }
        
        &.active {
          border-color: var(--primary);
          background: rgba(37, 99, 235, 0.05);
          color: var(--primary);
        }
      }
    }
    
    .mode-description {
      font-size: 13px;
      color: var(--gray-500);
      margin-top: 8px;
    }
    
    .btn-large {
      padding: 14px 28px;
      font-size: 16px;
    }
    
    .brief-card {
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .brief-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--gray-100);
      
      h3 {
        font-size: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }
    
    .brief-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: var(--gray-500);
    }
    
    .brief-content {
      padding: 20px;
      background: var(--gray-50);
      border-radius: var(--radius);
      max-height: 600px;
      overflow-y: auto;
    }
    
    .tool-calls {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--gray-100);
      
      h4 {
        font-size: 14px;
        margin-bottom: 12px;
        color: var(--gray-600);
      }
    }
    
    .tool-call {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: var(--gray-50);
      border-radius: var(--radius);
      margin-bottom: 8px;
      font-size: 13px;
      
      .tool-name {
        font-weight: 600;
        color: var(--primary);
        min-width: 150px;
      }
      
      .tool-args {
        color: var(--gray-500);
        font-family: monospace;
        font-size: 12px;
      }
    }
    
    .error-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #fee2e2;
      border: 1px solid #fecaca;
      
      .material-icons {
        color: var(--danger);
        font-size: 24px;
      }
      
      p {
        color: #991b1b;
      }
    }
  `]
})
export class BriefComponent {
    weekStart = this.getDefaultWeekStart();
    useAI = false;
    loading = false;
    brief: BriefResponse | null = null;
    error: string | null = null;

    constructor(private api: ApiService) { }

    getDefaultWeekStart(): string {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    generateBrief() {
        this.loading = true;
        this.error = null;
        this.brief = null;

        this.api.generateBrief(this.weekStart, this.useAI).subscribe({
            next: (res) => {
                this.brief = res;
                this.loading = false;
            },
            error: (err) => {
                this.error = err.error?.detail || 'Failed to generate brief';
                this.loading = false;
            }
        });
    }

    renderMarkdown(text: string): string {
        // Simple markdown rendering
        return text
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    formatArgs(args: Record<string, unknown>): string {
        return JSON.stringify(args);
    }
}
