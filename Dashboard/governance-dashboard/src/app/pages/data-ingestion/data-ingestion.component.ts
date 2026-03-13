import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-data-ingestion',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="data-ingestion">
      <header class="page-header">
        <div>
          <h1>Data Ingestion</h1>
          <p>Upload CSV files and meeting notes to populate the governance database</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-danger" (click)="resetData()" [disabled]="resetting">
            <span class="material-icons">delete_sweep</span>
            {{ resetting ? 'Clearing...' : 'Clear All Data' }}
          </button>
        </div>
      </header>

      <div class="reset-banner" *ngIf="resetMessage">
        <span class="material-icons">{{ resetSuccess ? 'check_circle' : 'error' }}</span>
        <span>{{ resetMessage }}</span>
        <button class="close-btn" (click)="resetMessage = ''">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="grid grid-2">
        <!-- Sustainability Metrics Upload -->
        <div class="card upload-card">
          <div class="upload-icon esg">
            <span class="material-icons">eco</span>
          </div>
          <h3>CSR Metrics</h3>
          <p>Upload corporate social responsibility metrics</p>
          <div class="file-format">
            <strong>Required columns:</strong> date, org_unit, metric_name, value, unit
          </div>
          <div class="upload-zone" 
               [class.dragover]="dragover.esg"
               (dragover)="onDragOver($event, 'esg')"
               (dragleave)="onDragLeave('esg')"
               (drop)="onDrop($event, 'esg')">
            <input type="file" id="esg-file" accept=".csv" (change)="onFileSelect($event, 'esg')" hidden>
            <label for="esg-file">
              <span class="material-icons">cloud_upload</span>
              <span>Drop CSV here or click to browse</span>
            </label>
          </div>
          <div class="upload-status" *ngIf="status['esg']">
            <span class="material-icons" [class.success]="status['esg']?.success">
              {{ status['esg']?.success ? 'check_circle' : 'error' }}
            </span>
            <span>{{ status['esg']?.message }}</span>
          </div>
        </div>

        <!-- People Metrics Upload -->
        <div class="card upload-card">
          <div class="upload-icon dei">
            <span class="material-icons">diversity_3</span>
          </div>
          <h3>HR Metrics</h3>
          <p>Upload human resources and workforce metrics</p>
          <div class="file-format">
            <strong>Required columns:</strong> date, org_unit, metric_name, value, unit
          </div>
          <div class="upload-zone"
               [class.dragover]="dragover.dei"
               (dragover)="onDragOver($event, 'dei')"
               (dragleave)="onDragLeave('dei')"
               (drop)="onDrop($event, 'dei')">
            <input type="file" id="dei-file" accept=".csv" (change)="onFileSelect($event, 'dei')" hidden>
            <label for="dei-file">
              <span class="material-icons">cloud_upload</span>
              <span>Drop CSV here or click to browse</span>
            </label>
          </div>
          <div class="upload-status" *ngIf="status['dei']">
            <span class="material-icons" [class.success]="status['dei']?.success">
              {{ status['dei']?.success ? 'check_circle' : 'error' }}
            </span>
            <span>{{ status['dei']?.message }}</span>
          </div>
        </div>

        <!-- Initiatives Upload -->
        <div class="card upload-card">
          <div class="upload-icon initiatives">
            <span class="material-icons">assignment</span>
          </div>
          <h3>Campaigns</h3>
          <p>Upload active campaigns and initiatives</p>
          <div class="file-format">
            <strong>Required columns:</strong> id, name, owner, pillar, status, due_date, last_update
          </div>
          <div class="upload-zone"
               [class.dragover]="dragover.initiatives"
               (dragover)="onDragOver($event, 'initiatives')"
               (dragleave)="onDragLeave('initiatives')"
               (drop)="onDrop($event, 'initiatives')">
            <input type="file" id="initiatives-file" accept=".csv" (change)="onFileSelect($event, 'initiatives')" hidden>
            <label for="initiatives-file">
              <span class="material-icons">cloud_upload</span>
              <span>Drop CSV here or click to browse</span>
            </label>
          </div>
          <div class="upload-status" *ngIf="status['initiatives']">
            <span class="material-icons" [class.success]="status['initiatives']?.success">
              {{ status['initiatives']?.success ? 'check_circle' : 'error' }}
            </span>
            <span>{{ status['initiatives']?.message }}</span>
          </div>
        </div>

        <!-- Meeting Notes Upload -->
        <div class="card upload-card">
          <div class="upload-icon notes">
            <span class="material-icons">sticky_note_2</span>
          </div>
          <h3>Meeting Notes</h3>
          <p>Add meeting notes for RAG context</p>
          <div class="notes-input">
            <label class="field-label">Meeting Date</label>
            <input type="date" class="input" [(ngModel)]="notesDate">
            <label class="field-label">Meeting Title</label>
            <input type="text" class="input" placeholder="e.g., Governance Steering Committee" 
                   [(ngModel)]="notesTitle">
            <label class="field-label">Meeting Notes</label>
            <textarea class="textarea" placeholder="Paste meeting notes here..."
                      [(ngModel)]="notesText"></textarea>
            <button class="btn btn-primary" (click)="uploadNotes()" [disabled]="!notesText || !notesDate || !notesTitle">
              <span class="material-icons">upload</span>
              Upload Notes
            </button>
          </div>
          <div class="upload-status" *ngIf="status['notes']">
            <span class="material-icons" [class.success]="status['notes']?.success">
              {{ status['notes']?.success ? 'check_circle' : 'error' }}
            </span>
            <span>{{ status['notes']?.message }}</span>
          </div>
        </div>
      </div>


    </div>
  `,
    styles: [`
    .data-ingestion {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      
      h1 {
        font-size: 28px;
        font-weight: 700;
        color: var(--gray-900);
      }
      
      p {
        color: var(--gray-500);
        margin-top: 4px;
      }
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: var(--radius);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      
      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        transform: translateY(-1px);
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .material-icons { font-size: 18px; }
    }
    
    .reset-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: var(--radius);
      margin-bottom: 24px;
      font-size: 14px;
      color: #166534;
      
      .material-icons { font-size: 20px; color: #16a34a; }
      
      .close-btn {
        margin-left: auto;
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        .material-icons { font-size: 16px; color: var(--gray-400); }
      }
    }
    
    .upload-card {
      text-align: center;
      
      h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 16px 0 8px;
      }
      
      p {
        color: var(--gray-500);
        font-size: 14px;
        margin-bottom: 12px;
      }
    }
    
    .upload-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      
      .material-icons {
        font-size: 32px;
        color: white;
      }
      
      &.esg { background: linear-gradient(135deg, #10b981, #059669); }
      &.dei { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
      &.initiatives { background: linear-gradient(135deg, #3b82f6, #2563eb); }
      &.notes { background: linear-gradient(135deg, #f59e0b, #d97706); }
    }
    
    .file-format {
      background: var(--gray-50);
      padding: 10px;
      border-radius: var(--radius);
      font-size: 12px;
      color: var(--gray-600);
      margin-bottom: 16px;
      
      strong {
        display: block;
        margin-bottom: 4px;
      }
    }
    
    .upload-zone {
      border: 2px dashed var(--gray-300);
      border-radius: var(--radius);
      padding: 32px;
      cursor: pointer;
      transition: all 0.2s;
      
      label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        color: var(--gray-500);
        
        .material-icons {
          font-size: 40px;
          color: var(--gray-400);
        }
      }
      
      &:hover, &.dragover {
        border-color: var(--primary);
        background: rgba(37, 99, 235, 0.05);
        
        label .material-icons {
          color: var(--primary);
        }
      }
    }
    
    .upload-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 14px;
      
      .material-icons {
        color: var(--danger);
        
        &.success {
          color: var(--secondary);
        }
      }
    }
    
    .notes-input {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;

      .field-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--gray-600);
        margin-bottom: -6px;
      }
    }
    
    .sample-data-info {
      margin-top: 24px;
      
      h3 {
        font-size: 16px;
        margin-bottom: 12px;
      }
      
      p {
        color: var(--gray-600);
        margin-bottom: 12px;
      }
      
      ul {
        list-style: none;
        padding: 0;
        
        li {
          padding: 8px 0;
          border-bottom: 1px solid var(--gray-100);
          
          code {
            background: var(--gray-100);
            padding: 2px 8px;
            border-radius: 4px;
          }
        }
      }
    }
  `]
})
export class DataIngestionComponent {
    dragover = { esg: false, dei: false, initiatives: false };
    status: Record<string, { success: boolean; message: string } | null> = {};
    notesText = '';
    notesDate = '';
    notesTitle = '';
    resetting = false;
    resetMessage = '';
    resetSuccess = false;

    constructor(private api: ApiService) { }

    onDragOver(event: DragEvent, type: string) {
        event.preventDefault();
        (this.dragover as any)[type] = true;
    }

    onDragLeave(type: string) {
        (this.dragover as any)[type] = false;
    }

    onDrop(event: DragEvent, type: string) {
        event.preventDefault();
        (this.dragover as any)[type] = false;
        const file = event.dataTransfer?.files[0];
        if (file) this.uploadFile(file, type);
    }

    onFileSelect(event: Event, type: string) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) this.uploadFile(file, type);
    }

    uploadFile(file: File, type: string) {
        let upload$;
        switch (type) {
            case 'esg':
                upload$ = this.api.uploadESG(file);
                break;
            case 'dei':
                upload$ = this.api.uploadDEI(file);
                break;
            case 'initiatives':
                upload$ = this.api.uploadInitiatives(file);
                break;
            default:
                return;
        }

        upload$.subscribe({
            next: (res) => {
                this.status[type] = {
                    success: true,
                    message: `Successfully ingested ${res.ingested_rows} rows`
                };
            },
            error: (err) => {
                this.status[type] = {
                    success: false,
                    message: err.error?.detail || 'Upload failed'
                };
            }
        });
    }

    uploadNotes() {
        this.api.uploadNotesToFolder(this.notesText, this.notesDate, this.notesTitle).subscribe({
            next: (res) => {
                this.status['notes'] = { success: true, message: `Notes saved for ${res.date} — ${res.file}` };
                this.notesText = '';
                this.notesTitle = '';
            },
            error: (err) => {
                this.status['notes'] = { success: false, message: err.error?.detail || 'Upload failed' };
            }
        });
    }

    resetData() {
        this.resetting = true;
        this.resetMessage = '';
        this.api.resetData().subscribe({
            next: (res) => {
                this.resetting = false;
                this.resetSuccess = true;
                const d = res.deleted;
                this.resetMessage = `Cleared: ${d.metrics} metrics, ${d.initiatives} initiatives, ${d.notes} notes, ${d.briefs} briefs`;
                this.status = {};
            },
            error: (err) => {
                this.resetting = false;
                this.resetSuccess = false;
                this.resetMessage = err.error?.detail || 'Failed to clear data';
            }
        });
    }
}
