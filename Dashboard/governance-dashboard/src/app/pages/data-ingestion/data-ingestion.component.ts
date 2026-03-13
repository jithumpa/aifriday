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
        <h1>Data Ingestion</h1>
        <p>Upload CSV files and meeting notes to populate the governance database</p>
      </header>

      <div class="grid grid-2">
        <!-- ESG Metrics Upload -->
        <div class="card upload-card">
          <div class="upload-icon esg">
            <span class="material-icons">eco</span>
          </div>
          <h3>ESG Metrics</h3>
          <p>Upload environmental, social, and governance metrics</p>
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

        <!-- DEI Metrics Upload -->
        <div class="card upload-card">
          <div class="upload-icon dei">
            <span class="material-icons">diversity_3</span>
          </div>
          <h3>DEI Metrics</h3>
          <p>Upload diversity, equity, and inclusion metrics</p>
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
          <h3>Initiatives</h3>
          <p>Upload sustainability and DEI initiatives</p>
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
            <input type="text" class="input" placeholder="Source name (e.g., meeting_2024_03.txt)" 
                   [(ngModel)]="notesSource">
            <textarea class="textarea" placeholder="Paste meeting notes here..."
                      [(ngModel)]="notesText"></textarea>
            <button class="btn btn-primary" (click)="uploadNotes()" [disabled]="!notesText">
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

      <!-- Sample Data Info -->
      <div class="card sample-data-info">
        <h3>📁 Sample Data Available</h3>
        <p>Sample CSV files are available in the backend's <code>sample_data/</code> folder:</p>
        <ul>
          <li><code>esg_metrics.csv</code> - CO2 emissions data</li>
          <li><code>dei_metrics.csv</code> - Gender balance metrics</li>
          <li><code>initiatives.csv</code> - Sample initiatives with statuses</li>
          <li><code>meeting_notes.txt</code> - Sample meeting notes</li>
        </ul>
      </div>
    </div>
  `,
    styles: [`
    .data-ingestion {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
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
    notesSource = 'meeting_notes.txt';

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
        this.api.uploadNotes(this.notesText, this.notesSource).subscribe({
            next: () => {
                this.status['notes'] = { success: true, message: 'Notes uploaded successfully' };
                this.notesText = '';
            },
            error: (err) => {
                this.status['notes'] = { success: false, message: err.error?.detail || 'Upload failed' };
            }
        });
    }
}
