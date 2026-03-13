import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface MeetingNote {
    id: number;
    date: string;
    title: string;
    description?: string;
    source: string;
}

@Component({
    selector: 'app-brief',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="brief-page">
      <header class="page-header">
        <div>
          <h1>
            <span class="material-icons header-icon">summarize</span>
            Weekly Summarize
          </h1>
          <p>Select a date, choose a meeting, and get AI-powered bullet point summary</p>
        </div>
      </header>

      <!-- Date Filter -->
      <div class="card">
        <h3 class="section-title">
          <span class="material-icons">filter_list</span>
          Filter by Date
        </h3>
        <select class="date-select" [(ngModel)]="selectedDate" (ngModelChange)="onDateChange($event)" *ngIf="availableDates.length > 0">
          <option [ngValue]="null" disabled>-- Select a date --</option>
          <option *ngFor="let d of availableDates" [ngValue]="d">{{ formatDate(d) }}</option>
        </select>
        <div class="empty-state" *ngIf="availableDates.length === 0 && !loadingDates">
          <span class="material-icons">event_busy</span>
          <p>No meeting notes found. Upload notes via <strong>Data Ingestion</strong> page.</p>
        </div>
        <div class="loading-row" *ngIf="loadingDates">
          <span class="material-icons spin">sync</span>
          Loading...
        </div>
      </div>

      <!-- Meetings for selected date -->
      <div class="card" *ngIf="selectedDate && filteredNotes.length > 0">
        <h3 class="section-title">
          <span class="material-icons">groups</span>
          Meetings on {{ formatDate(selectedDate) }}
        </h3>
        <div class="meeting-list">
          <button
            *ngFor="let note of filteredNotes"
            class="meeting-item"
            [class.selected]="selectedNote?.id === note.id"
            (click)="selectNote(note)">
            <span class="material-icons meeting-icon">description</span>
            <div class="meeting-info">
              <span class="meeting-title">{{ note.title }}</span>
              <span class="meeting-desc">{{ note.description }}</span>
            </div>
            <span class="material-icons check-icon" *ngIf="selectedNote?.id === note.id">check_circle</span>
          </button>
        </div>

        <!-- Summarize Button -->
        <button class="btn btn-primary btn-large summarize-btn" (click)="summarize()" [disabled]="loading || !selectedNote">
          <span class="material-icons spin" *ngIf="loading">sync</span>
          <span class="material-icons" *ngIf="!loading">auto_awesome</span>
          {{ loading ? 'Summarizing...' : 'Summarize' }}
        </button>
      </div>

      <!-- Summary Output -->
      <div class="card summary-card" *ngIf="summary">
        <div class="summary-header">
          <h3>
            <span class="material-icons">fact_check</span>
            Summary
          </h3>
          <span class="badge badge-ai">AI Generated</span>
        </div>
        <div class="summary-content" [innerHTML]="renderMarkdown(summary)"></div>
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
      max-width: 900px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 28px;

      h1 {
        font-size: 28px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-icon {
        font-size: 32px;
        color: var(--primary);
      }

      p {
        color: var(--gray-500);
        margin-top: 4px;
      }
    }

    .card {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;

      .material-icons {
        font-size: 20px;
        color: var(--primary);
      }
    }

    .date-select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid var(--gray-200);
      border-radius: var(--radius);
      font-size: 15px;
      font-family: inherit;
      background: white;
      cursor: pointer;
      transition: border-color 0.2s;
      appearance: auto;

      &:focus {
        outline: none;
        border-color: var(--primary);
      }
    }

    .meeting-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .meeting-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      border: 2px solid var(--gray-200);
      border-radius: var(--radius);
      background: white;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
      width: 100%;

      .meeting-icon {
        color: var(--gray-400);
        font-size: 28px;
        flex-shrink: 0;
      }

      .meeting-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .meeting-title {
        font-weight: 600;
        font-size: 15px;
      }

      .meeting-desc {
        font-size: 13px;
        color: var(--gray-500);
        line-height: 1.4;
      }

      .check-icon {
        color: var(--primary);
        font-size: 22px;
        flex-shrink: 0;
      }

      &:hover {
        border-color: var(--primary);
        background: rgba(37, 99, 235, 0.02);
      }

      &.selected {
        border-color: var(--primary);
        background: rgba(37, 99, 235, 0.05);

        .meeting-icon { color: var(--primary); }
      }
    }

    .summarize-btn {
      width: 100%;
      padding: 16px;
      font-size: 16px;
      margin-top: 16px;
    }

    .btn-large {
      padding: 14px 28px;
      font-size: 16px;
    }

    .summary-card {
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .summary-header {
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
        gap: 8px;
        margin: 0;
      }
    }

    .badge-ai {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .summary-content {
      padding: 20px;
      background: var(--gray-50);
      border-radius: var(--radius);
      max-height: 600px;
      overflow-y: auto;
      line-height: 1.8;
      white-space: pre-line;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: var(--gray-500);

      .material-icons {
        font-size: 48px;
        color: var(--gray-300);
        margin-bottom: 8px;
      }

      p { margin: 0; font-size: 14px; }
    }

    .loading-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--gray-500);
      font-size: 14px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
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
        margin: 0;
      }
    }
  `]
})
export class BriefComponent implements OnInit {
    availableDates: string[] = [];
    selectedDate: string | null = null;
    allNotes: MeetingNote[] = [];
    filteredNotes: MeetingNote[] = [];
    selectedNote: MeetingNote | null = null;
    loading = false;
    loadingDates = false;
    summary: string | null = null;
    error: string | null = null;

    constructor(private api: ApiService) { }

    ngOnInit() {
        this.loadAvailableDates();
    }

    loadAvailableDates() {
        this.loadingDates = true;
        this.api.listNotes().subscribe({
            next: (res) => {
                this.availableDates = res.available_dates;
                this.allNotes = res.notes;
                this.loadingDates = false;
            },
            error: () => {
                this.loadingDates = false;
            }
        });
    }

    onDateChange(date: string) {
        this.selectedNote = null;
        this.summary = null;
        this.error = null;
        this.filteredNotes = this.allNotes.filter(n => n.date === date);
    }

    selectNote(note: MeetingNote) {
        this.selectedNote = note;
        this.summary = null;
        this.error = null;
    }

    summarize() {
        if (!this.selectedNote) return;
        this.loading = true;
        this.error = null;
        this.summary = null;

        this.api.summarize(this.selectedNote.id).subscribe({
            next: (res) => {
                this.summary = res.summary;
                this.loading = false;
            },
            error: (err) => {
                this.error = err.error?.detail || 'Failed to summarize. Please try again.';
                this.loading = false;
            }
        });
    }

    formatDate(dateStr: string): string {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    renderMarkdown(text: string): string {
        return text
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
}
