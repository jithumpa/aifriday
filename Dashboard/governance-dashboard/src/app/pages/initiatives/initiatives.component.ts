import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Initiative } from '../../models/api.models';

@Component({
    selector: 'app-initiatives',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="initiatives-page">
      <header class="page-header">
        <div>
          <h1>Initiatives Tracker</h1>
          <p>Monitor sustainability and DEI initiatives</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="loadInitiatives()">
            <span class="material-icons">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <!-- Status Filter -->
      <div class="filters card">
        <div class="filter-group">
          <label>Filter by Status:</label>
          <div class="filter-chips">
            <button [class.active]="statusFilter === 'all'" (click)="setFilter('all')">
              All
            </button>
            <button [class.active]="statusFilter === 'overdue'" (click)="setFilter('overdue')">
              <span class="material-icons">warning</span>
              Overdue
            </button>
            <button [class.active]="statusFilter === 'at_risk'" (click)="setFilter('at_risk')">
              <span class="material-icons">error_outline</span>
              At Risk
            </button>
            <button [class.active]="statusFilter === 'in_progress'" (click)="setFilter('in_progress')">
              <span class="material-icons">pending</span>
              In Progress
            </button>
            <button [class.active]="statusFilter === 'done'" (click)="setFilter('done')">
              <span class="material-icons">check_circle</span>
              Done
            </button>
          </div>
        </div>
        <div class="search-group">
          <span class="material-icons">search</span>
          <input type="text" class="input" placeholder="Search initiatives..." [(ngModel)]="searchTerm">
        </div>
      </div>

      <!-- Initiatives Grid -->
      <div class="initiatives-grid" *ngIf="!loading">
        <div class="initiative-card" *ngFor="let init of filteredInitiatives"
             [class.overdue]="init.is_overdue"
             [class.at-risk]="init.status.toLowerCase() === 'at risk'">
          <div class="initiative-header">
            <span class="initiative-id">{{ init.id }}</span>
            <span class="badge" [ngClass]="getStatusClass(init)">
              {{ init.status }}
            </span>
          </div>
          <h3 class="initiative-name">{{ init.name }}</h3>
          <div class="initiative-details">
            <div class="detail">
              <span class="material-icons">person</span>
              <span>{{ init.owner }}</span>
            </div>
            <div class="detail">
              <span class="material-icons">category</span>
              <span>{{ init.pillar }}</span>
            </div>
            <div class="detail" [class.overdue-date]="init.is_overdue">
              <span class="material-icons">event</span>
              <span>Due: {{ init.due_date || 'Not set' }}</span>
            </div>
          </div>
          <div class="initiative-actions">
            <button class="btn btn-secondary btn-sm" (click)="analyzeInitiative(init.id)">
              <span class="material-icons">analytics</span>
              AI Analysis
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading initiatives...</p>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!loading && filteredInitiatives.length === 0">
        <span class="material-icons">inbox</span>
        <h3>No initiatives found</h3>
        <p>Upload initiatives data or adjust your filters</p>
      </div>

      <!-- Analysis Modal -->
      <div class="modal-overlay" *ngIf="analysisResult" (click)="closeAnalysis()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>🤖 AI Analysis: {{ selectedInitiative }}</h2>
            <button class="close-btn" (click)="closeAnalysis()">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-content markdown-content" [innerHTML]="renderMarkdown(analysisResult)"></div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .initiatives-page {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      
      h1 { font-size: 28px; font-weight: 700; }
      p { color: var(--gray-500); margin-top: 4px; }
    }
    
    .filters {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .filter-group {
      display: flex;
      align-items: center;
      gap: 12px;
      
      label {
        font-weight: 500;
        color: var(--gray-600);
      }
    }
    
    .filter-chips {
      display: flex;
      gap: 8px;
      
      button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: 1px solid var(--gray-200);
        border-radius: 20px;
        background: white;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
        
        .material-icons { font-size: 16px; }
        
        &:hover {
          border-color: var(--primary);
        }
        
        &.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      }
    }
    
    .search-group {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .material-icons {
        color: var(--gray-400);
      }
      
      input {
        width: 250px;
      }
    }
    
    .initiatives-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    
    .initiative-card {
      background: white;
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow);
      border-left: 4px solid var(--gray-200);
      transition: all 0.2s;
      
      &:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }
      
      &.overdue {
        border-left-color: var(--danger);
        background: linear-gradient(135deg, white 0%, #fef2f2 100%);
      }
      
      &.at-risk {
        border-left-color: var(--warning);
        background: linear-gradient(135deg, white 0%, #fffbeb 100%);
      }
    }
    
    .initiative-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .initiative-id {
      font-size: 12px;
      font-weight: 600;
      color: var(--gray-500);
      background: var(--gray-100);
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .initiative-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--gray-800);
    }
    
    .initiative-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .detail {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--gray-600);
      
      .material-icons {
        font-size: 16px;
        color: var(--gray-400);
      }
      
      &.overdue-date {
        color: var(--danger);
        font-weight: 500;
        
        .material-icons { color: var(--danger); }
      }
    }
    
    .initiative-actions {
      padding-top: 12px;
      border-top: 1px solid var(--gray-100);
    }
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }
    
    .loading-state, .empty-state {
      text-align: center;
      padding: 60px 20px;
      
      .spinner {
        margin: 0 auto 16px;
      }
      
      .material-icons {
        font-size: 64px;
        color: var(--gray-300);
        margin-bottom: 16px;
      }
      
      h3 {
        font-size: 18px;
        color: var(--gray-600);
        margin-bottom: 8px;
      }
      
      p {
        color: var(--gray-400);
      }
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    
    .modal {
      background: white;
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 700px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--gray-100);
      
      h2 { font-size: 18px; }
    }
    
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      
      &:hover {
        background: var(--gray-100);
      }
    }
    
    .modal-content {
      padding: 24px;
      overflow-y: auto;
    }
  `]
})
export class InitiativesComponent implements OnInit {
    initiatives: Initiative[] = [];
    loading = false;
    statusFilter = 'all';
    searchTerm = '';
    selectedInitiative = '';
    analysisResult = '';
    analyzing = false;

    constructor(private api: ApiService) { }

    ngOnInit() {
        this.loadInitiatives();
    }

    loadInitiatives() {
        this.loading = true;
        // Note: We'll use the chat endpoint to query initiatives
        this.api.chat('List all initiatives with their status, owner, pillar, and due dates. Format as a structured list.').subscribe({
            next: (res) => {
                // Parse response - for now we'll show the raw data
                this.loading = false;
                // This is a simplified version - in production you'd have a dedicated endpoint
            },
            error: () => {
                this.loading = false;
            }
        });

        // For demo, set some sample data
        this.initiatives = [
            { id: 'INIT-1', name: 'Reduce plastic packaging', owner: 'Jane Doe', pillar: 'Packaging', status: 'In Progress', due_date: '2026-02-28', last_update: '2026-02-20', is_overdue: true },
            { id: 'INIT-2', name: 'Supply chain GHG', owner: 'John Smith', pillar: 'Supply Chain', status: 'At Risk', due_date: '2026-03-05', last_update: '2026-03-01', is_overdue: true },
            { id: 'INIT-3', name: 'DEI training rollout', owner: 'Anna Lee', pillar: 'HR', status: 'Done', due_date: '2026-02-15', last_update: '2026-02-15', is_overdue: false },
            { id: 'INIT-4', name: 'Water efficiency program', owner: 'Mark Tan', pillar: 'Operations', status: 'In Progress', due_date: '2026-03-10', last_update: '2026-02-25', is_overdue: false },
        ];
        this.loading = false;
    }

    get filteredInitiatives(): Initiative[] {
        return this.initiatives.filter(init => {
            // Status filter
            if (this.statusFilter !== 'all') {
                if (this.statusFilter === 'overdue' && !init.is_overdue) return false;
                if (this.statusFilter === 'at_risk' && init.status?.toLowerCase() !== 'at risk') return false;
                if (this.statusFilter === 'in_progress' && init.status?.toLowerCase() !== 'in progress') return false;
                if (this.statusFilter === 'done' && init.status?.toLowerCase() !== 'done') return false;
            }

            // Search filter
            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                return init.name.toLowerCase().includes(term) ||
                    init.owner.toLowerCase().includes(term) ||
                    init.pillar.toLowerCase().includes(term) ||
                    init.id.toLowerCase().includes(term);
            }

            return true;
        });
    }

    setFilter(filter: string) {
        this.statusFilter = filter;
    }

    getStatusClass(init: Initiative): string {
        if (init.is_overdue) return 'badge-danger';
        switch (init.status?.toLowerCase()) {
            case 'done': return 'badge-success';
            case 'at risk': return 'badge-warning';
            case 'in progress': return 'badge-info';
            default: return '';
        }
    }

    analyzeInitiative(id: string) {
        this.selectedInitiative = id;
        this.analyzing = true;

        this.api.analyzeInitiative(id).subscribe({
            next: (res) => {
                this.analysisResult = res.response;
                this.analyzing = false;
            },
            error: (err) => {
                this.analysisResult = `Error: ${err.error?.detail || 'Failed to analyze initiative'}`;
                this.analyzing = false;
            }
        });
    }

    closeAnalysis() {
        this.analysisResult = '';
        this.selectedInitiative = '';
    }

    renderMarkdown(text: string): string {
        if (!text) return '';
        return text
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
}
