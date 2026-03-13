import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
    template: `
    <div class="app-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-icon">🌱</span>
            <span class="logo-text">GovernIQ</span>
          </div>
          <span class="logo-subtitle">Sustainability & DEI</span>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <span class="material-icons">dashboard</span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/data" routerLinkActive="active" class="nav-item">
            <span class="material-icons">upload_file</span>
            <span>Data Ingestion</span>
          </a>
          <a routerLink="/brief" routerLinkActive="active" class="nav-item">
            <span class="material-icons">description</span>
            <span>Weekly Brief</span>
          </a>
          <a routerLink="/chat" routerLinkActive="active" class="nav-item">
            <span class="material-icons">chat</span>
            <span>AI Chat</span>
          </a>
          <a routerLink="/initiatives" routerLinkActive="active" class="nav-item">
            <span class="material-icons">task_alt</span>
            <span>Initiatives</span>
          </a>
        </nav>
        
        <div class="sidebar-footer">
          <div class="api-status" [class.connected]="apiConnected">
            <span class="status-dot"></span>
            <span>{{ apiConnected ? 'API Connected' : 'API Offline' }}</span>
          </div>
        </div>
      </aside>
      
      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
    styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
    }
    
    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      color: white;
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
      z-index: 100;
    }
    
    .sidebar-header {
      padding: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      
      &-icon {
        font-size: 28px;
      }
      
      &-text {
        font-size: 22px;
        font-weight: 700;
        background: linear-gradient(135deg, #10b981, #3b82f6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }
    
    .logo-subtitle {
      display: block;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }
    
    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: #94a3b8;
      text-decoration: none;
      border-radius: 8px;
      margin-bottom: 4px;
      transition: all 0.2s;
      
      .material-icons {
        font-size: 20px;
      }
      
      &:hover {
        background: rgba(255,255,255,0.05);
        color: white;
      }
      
      &.active {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        
        .material-icons {
          color: #60a5fa;
        }
      }
    }
    
    .sidebar-footer {
      padding: 16px 24px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    
    .api-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #94a3b8;
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
      }
      
      &.connected .status-dot {
        background: #10b981;
      }
    }
    
    .main-content {
      flex: 1;
      margin-left: 260px;
      padding: 24px;
      min-height: 100vh;
    }
  `]
})
export class AppComponent {
    apiConnected = false;

    constructor() {
        this.checkApiHealth();
        setInterval(() => this.checkApiHealth(), 30000);
    }

    async checkApiHealth() {
        try {
            const response = await fetch('/api/health');
            this.apiConnected = response.ok;
        } catch {
            this.apiConnected = false;
        }
    }
}
