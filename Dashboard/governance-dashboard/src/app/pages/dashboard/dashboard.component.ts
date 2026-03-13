import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { HealthResponse, LatestResponse, ESGAnalyticsResponse } from '../../models/api.models';
import { Chart, registerables } from 'chart.js';
import { catchError, map, of } from 'rxjs';

Chart.register(...registerables);

interface ParsedItem {
  icon: string;
  label: string;
  text: string;
  severity: 'high' | 'medium' | 'low' | 'info';
}

interface RecItem {
  priority: 'High' | 'Medium' | 'Low';
  action: string;
  department: string;
  icon: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    template: `
    <div class="dashboard">
      <header class="page-header">
        <div>
          <h1>GovernIQ</h1>
          <p>AI-powered decision support for workforce, CSR, campaigns, and leadership action.</p>
        </div>
      </header>

      <!-- Status Cards -->
      <div class="grid grid-3 stats-grid">
        <div class="stat-card">
          <div class="stat-row">
            <div class="stat-icon esg">
              <span class="material-icons">eco</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">CSR</span>
              <span class="stat-value">Active</span>
            </div>
          </div>
          <button class="ask-ai-btn" (click)="askAI('Show me ONLY CSR/Sustainability metrics and trends. Use source=esg only, do NOT include any HR or workforce data.')">
            <span class="material-icons">smart_toy</span> Ask AI
          </button>
        </div>
        
        <div class="stat-card">
          <div class="stat-row">
            <div class="stat-icon dei">
              <span class="material-icons">diversity_3</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">Workforce</span>
              <span class="stat-value">Active</span>
            </div>
          </div>
          <button class="ask-ai-btn" (click)="askAI('Show me ONLY HR/Workforce metrics and trends. Use source=dei only, do NOT include any CSR or sustainability data.')">
            <span class="material-icons">smart_toy</span> Ask AI
          </button>
        </div>
        
        <div class="stat-card" [class.warning]="stats.overdueCount > 0">
          <div class="stat-row">
            <div class="stat-icon overdue">
              <span class="material-icons">warning</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">Overdue Items</span>
              <span class="stat-value">{{ stats.overdueCount }}</span>
            </div>
          </div>
          <button class="ask-ai-btn" (click)="askAI('Which campaigns are overdue and what actions should leadership take?')">
            <span class="material-icons">smart_toy</span> Ask AI
          </button>
        </div>
      </div>

      <!-- Insights Section -->
      <section class="ai-section">
        <div class="ai-section-header">
          <div class="ai-section-title-row">
            <span class="material-icons section-icon insight-icon">lightbulb</span>
            <h2>Insights</h2>
          </div>
          <div class="ai-section-controls">
            <select [(ngModel)]="insightsCategory" class="category-dropdown">
              <option value="csr">CSR</option>
              <option value="hr">HR / Workforce</option>
            </select>
            <button class="generate-btn" (click)="generateInsights()" [disabled]="insightsLoading">
              <span class="material-icons" [class.spin]="insightsLoading">{{ insightsLoading ? 'sync' : 'auto_awesome' }}</span>
              {{ insightsLoading ? 'Generating...' : 'Generate' }}
            </button>
          </div>
        </div>
        <div class="ai-section-body">
          <div class="ai-placeholder" *ngIf="!insightsGenerated && !insightsLoading">
            <span class="material-icons">lightbulb</span>
            <p>Select a category and click <strong>Generate</strong> to get AI insights.</p>
          </div>
          <div class="ai-loading" *ngIf="insightsLoading">
            <div class="ai-typing"><span></span><span></span><span></span></div>
            <p>Analyzing {{ insightsCategory === 'csr' ? 'CSR' : 'HR' }} data for insights...</p>
          </div>
          <div class="split-view" *ngIf="insightsGenerated && !insightsLoading">
            <div class="split-left">
              <table class="panel-table">
                <thead>
                  <tr>
                    <th class="col-num">#</th>
                    <th>Insight</th>
                    <th class="col-sev">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of insightsItems; let i = index" class="panel-row">
                    <td class="row-num">{{ i + 1 }}</td>
                    <td class="row-text">
                      <span class="row-label" *ngIf="item.label">{{ item.label }}: </span>{{ item.text }}
                    </td>
                    <td><span class="severity-badge" [ngClass]="item.severity">{{ item.severity }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="split-right">
              <div class="diagram-card">
                <h4 class="diagram-title">Severity Distribution</h4>
                <div class="css-donut" [style.background]="getDonutGradient(insightsItems)">
                  <div class="donut-center">
                    <span class="donut-num">{{ insightsItems.length }}</span>
                    <span class="donut-sublabel">Insights</span>
                  </div>
                </div>
                <div class="dist-legend">
                  <div class="legend-row" *ngFor="let d of getSeverityDist(insightsItems)">
                    <span class="legend-dot" [ngClass]="d.key"></span>
                    <span class="legend-key">{{ d.label }}</span>
                    <span class="legend-val">{{ d.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Risks Section -->
      <section class="ai-section">
        <div class="ai-section-header">
          <div class="ai-section-title-row">
            <span class="material-icons section-icon risk-icon">warning_amber</span>
            <h2>Risks</h2>
          </div>
          <div class="ai-section-controls">
            <select [(ngModel)]="risksCategory" class="category-dropdown">
              <option value="csr">CSR</option>
              <option value="hr">HR / Workforce</option>
            </select>
            <button class="generate-btn" (click)="generateRisks()" [disabled]="risksLoading">
              <span class="material-icons" [class.spin]="risksLoading">{{ risksLoading ? 'sync' : 'auto_awesome' }}</span>
              {{ risksLoading ? 'Generating...' : 'Generate' }}
            </button>
          </div>
        </div>
        <div class="ai-section-body">
          <div class="ai-placeholder" *ngIf="!risksGenerated && !risksLoading">
            <span class="material-icons">warning_amber</span>
            <p>Select a category and click <strong>Generate</strong> to detect risks.</p>
          </div>
          <div class="ai-loading" *ngIf="risksLoading">
            <div class="ai-typing"><span></span><span></span><span></span></div>
            <p>Scanning {{ risksCategory === 'csr' ? 'CSR' : 'HR' }} data for risks...</p>
          </div>
          <div class="split-view" *ngIf="risksGenerated && !risksLoading">
            <div class="split-left">
              <table class="panel-table">
                <thead>
                  <tr>
                    <th class="col-sev">Severity</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of risksItems; let i = index" class="panel-row">
                    <td><span class="severity-badge" [ngClass]="item.severity">{{ item.severity }}</span></td>
                    <td class="row-text">
                      <span class="row-label" *ngIf="item.label">{{ item.label }}: </span>{{ item.text }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="split-right">
              <div class="diagram-card risk-diagram">
                <h4 class="diagram-title">Risk Assessment</h4>
                <div class="risk-level-indicator" [ngClass]="getOverallRisk(risksItems)">
                  <span class="material-icons">shield</span>
                  <span class="risk-level-text">{{ getOverallRisk(risksItems) | uppercase }} RISK</span>
                </div>
                <div class="severity-bars">
                  <div class="sbar" *ngFor="let d of getSeverityDist(risksItems)">
                    <span class="sbar-label">{{ d.label }}</span>
                    <div class="sbar-track">
                      <div class="sbar-fill" [ngClass]="d.key" [style.width.%]="(d.count / risksItems.length) * 100"></div>
                    </div>
                    <span class="sbar-count">{{ d.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Recommendations Panel -->
      <section class="ai-section rec-panel">
        <div class="ai-section-header">
          <div class="ai-section-title-row">
            <span class="material-icons section-icon rec-icon">rocket_launch</span>
            <h2>Recommendation Panel</h2>
          </div>
          <div class="ai-section-controls">
            <select [(ngModel)]="recsCategory" class="category-dropdown">
              <option value="csr">CSR</option>
              <option value="hr">HR / Workforce</option>
            </select>
            <button class="generate-btn" (click)="generateRecommendations()" [disabled]="recsLoading">
              <span class="material-icons" [class.spin]="recsLoading">{{ recsLoading ? 'sync' : 'auto_awesome' }}</span>
              {{ recsLoading ? 'Generating...' : 'Generate' }}
            </button>
          </div>
        </div>
        <div class="ai-section-body">
          <div class="ai-placeholder" *ngIf="!recsGenerated && !recsLoading">
            <span class="material-icons">rocket_launch</span>
            <p>Select a category and click <strong>Generate</strong> to get AI-powered recommendations.</p>
          </div>
          <div class="ai-loading" *ngIf="recsLoading">
            <div class="ai-typing"><span></span><span></span><span></span></div>
            <p>Generating {{ recsCategory === 'csr' ? 'CSR' : 'HR' }} recommendations...</p>
          </div>
          <div class="split-view" *ngIf="recsGenerated && !recsLoading">
            <div class="split-left">
              <table class="rec-table">
                <thead>
                  <tr>
                    <th class="col-priority">Priority</th>
                    <th class="col-action">Recommended Action</th>
                    <th class="col-dept">Department</th>
                    <th class="col-icon"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let rec of recItems" class="rec-row">
                    <td>
                      <span class="priority-badge" [ngClass]="rec.priority.toLowerCase()">{{ rec.priority }}</span>
                    </td>
                    <td class="rec-action-cell">{{ rec.action }}</td>
                    <td class="rec-dept-cell">{{ rec.department }}</td>
                    <td class="rec-icon-cell">
                      <span class="material-icons rec-action-icon">{{ rec.icon }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="split-right">
              <div class="diagram-card rec-diagram">
                <h4 class="diagram-title">Priority Breakdown</h4>
                <div class="css-donut" [style.background]="getRecDonutGradient(recItems)">
                  <div class="donut-center">
                    <span class="donut-num">{{ recItems.length }}</span>
                    <span class="donut-sublabel">Actions</span>
                  </div>
                </div>
                <div class="dist-legend">
                  <div class="legend-row" *ngFor="let d of getPriorityDist(recItems)">
                    <span class="legend-dot" [ngClass]="d.key"></span>
                    <span class="legend-key">{{ d.label }}</span>
                    <span class="legend-val">{{ d.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ESG Trends Chart -->
      <div class="ai-chart-card">
        <div class="ai-glow-orb"></div>
        <div class="ai-chart-header">
          <div class="ai-chart-title">
            <div>
              <h3>CSR Trends Analysis</h3>
            </div>
          </div>
          <div class="kpi-row" *ngIf="analytics">
            <div class="kpi-tile">
              <span class="kpi-label">Avg Daily</span>
              <span class="kpi-value">{{ analytics.avg_daily | number:'1.0-0' }}</span>
            </div>
            <div class="kpi-tile kpi-peak">
              <span class="kpi-label">Peak</span>
              <span class="kpi-value">{{ analytics.max | number }}</span>
            </div>
            <div class="kpi-tile kpi-floor">
              <span class="kpi-label">Floor</span>
              <span class="kpi-value">{{ analytics.min | number }}</span>
            </div>
            <div class="trend-pills" *ngIf="trendSummary">
              <span class="trend-pill up"><span class="material-icons">trending_up</span>{{ trendSummary.up }} Up</span>
              <span class="trend-pill down"><span class="material-icons">trending_down</span>{{ trendSummary.down }} Down</span>
              <span class="trend-pill same"><span class="material-icons">trending_flat</span>{{ trendSummary.same }} Flat</span>
            </div>
          </div>
        </div>

        <div class="ai-chart-controls">
          <div class="date-filters">
            <div class="date-field">
              <label>FROM</label>
              <input type="date" [(ngModel)]="dateFrom" [max]="dateTo" />
            </div>
            <span class="date-sep material-icons">arrow_forward</span>
            <div class="date-field">
              <label>TO</label>
              <input type="date" [(ngModel)]="dateTo" [min]="dateFrom" />
            </div>
            <button class="apply-btn" (click)="applyDateFilter()">
              <span class="material-icons">insights</span>
              Analyze
            </button>
          </div>
          <div class="view-toggle-row">
            <div class="view-toggle">
              <button [class.active]="activeTab === 'weekly'" (click)="switchTab('weekly')">
                <span class="material-icons">bar_chart</span>Weekly
              </button>
              <button [class.active]="activeTab === 'monthly'" (click)="switchTab('monthly')">
                <span class="material-icons">show_chart</span>Monthly
              </button>
            </div>
          </div>
        </div>

        <div class="ai-chart-canvas-wrap">
          <canvas #esgChart></canvas>
        </div>

        <div class="no-data-ai" *ngIf="!hasChartData">
          <span class="material-icons">auto_graph</span>
          <p>No CSR data in this range</p>
          <small>Adjust the date filters or upload CSR data first</small>
        </div>
      </div>

      <!-- Features Section -->
      <div class="grid grid-2">
        <!-- API Status -->
        <div class="card">
          <div class="card-header">
            <h3>API Status</h3>
            <span class="badge" [class.badge-success]="health?.status === 'healthy'" 
                  [class.badge-danger]="health?.status !== 'healthy'">
              {{ health?.status || 'Checking...' }}
            </span>
          </div>
          <div class="features-list" *ngIf="health">
            <div class="feature-item" *ngFor="let feature of features">
              <span class="material-icons" [class.active]="feature.enabled">
                {{ feature.enabled ? 'check_circle' : 'cancel' }}
              </span>
              <span>{{ feature.name }}</span>
            </div>
          </div>
          <div class="api-version" *ngIf="health">
            Version: {{ health.version }}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <div class="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div class="quick-actions">
            <a routerLink="/data" class="action-btn">
              <span class="material-icons">upload_file</span>
              <span>Upload Insights</span>
            </a>
            <a routerLink="/chat" class="action-btn">
              <span class="material-icons">smart_toy</span>
              <span>AI Chat</span>
            </a>
            <a routerLink="/initiatives" class="action-btn">
              <span class="material-icons">campaign</span>
              <span>Initiatives / Campaigns</span>
            </a>
            <button class="action-btn" (click)="detectAnomalies()">
              <span class="material-icons">troubleshoot</span>
              <span>Risk Detection</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Meeting Summary -->
      <div class="card">
        <div class="card-header">
          <h3>Meeting Summary</h3>
          <a routerLink="/brief" class="btn btn-secondary">Summarize Now</a>
        </div>
        <div class="last-brief-info">
          <span class="material-icons">summarize</span>
          <span>Upload meeting notes and use AI to extract critical points, decisions, blockers, and action items.</span>
        </div>
        <button class="ask-ai-btn" style="margin-top:12px" (click)="askAI('Summarize the latest meeting notes and highlight key decisions, blockers and action items')" title="Ask AI about Meetings">
          <span class="material-icons">smart_toy</span> Ask AI
        </button>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('esgChart') esgChartRef!: ElementRef<HTMLCanvasElement>;

    health: HealthResponse | null = null;
    latestBrief: string | null = null;
    hasChartData = false;
    analytics: ESGAnalyticsResponse | null = null;
    activeTab: 'weekly' | 'monthly' = 'weekly';
    dateFrom = '';
    dateTo = '';
    features: { name: string; enabled: boolean }[] = [];
    trendSummary: { up: number; down: number; same: number } | null = null;
    private chart: Chart | null = null;

    // Per-section AI state
    insightsCategory = 'csr';
    insightsLoading = false;
    insightsGenerated = false;
    insightsItems: ParsedItem[] = [];

    risksCategory = 'csr';
    risksLoading = false;
    risksGenerated = false;
    risksItems: ParsedItem[] = [];

    recsCategory = 'csr';
    recsLoading = false;
    recsGenerated = false;
    recItems: RecItem[] = [];

    stats = {
        esgMetrics: 0,
        deiMetrics: 0,
        initiatives: 0,
        overdueCount: 0
    };

    constructor(private api: ApiService, private router: Router) { }

    ngOnInit() {
        // Default date range: last 90 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);
        this.dateFrom = start.toISOString().split('T')[0];
        this.dateTo = end.toISOString().split('T')[0];

        this.loadHealth();
        this.loadLatest();
        this.loadStats();
    }

    ngAfterViewInit() {
        this.loadESGTrends();
    }

    ngOnDestroy() {
        this.chart?.destroy();
    }

    // AI Section Methods
    generateInsights() {
      this.insightsLoading = true;
      this.insightsGenerated = false;
      const prompt = this.insightsCategory === 'csr'
        ? 'Provide key insights from CSR/Sustainability metrics ONLY. Use source=esg only. Do NOT include any HR or workforce data. Focus on trends, patterns, and notable findings.'
        : 'Provide key insights from HR/Workforce metrics ONLY. Use source=dei only. Do NOT include any CSR or sustainability data. Focus on trends, patterns, and notable findings.';
      this.api.chat(prompt).subscribe({
        next: (res) => {
          this.insightsItems = this.parseItems(res.response, 'insight');
          this.insightsGenerated = true;
          this.insightsLoading = false;
        },
        error: (err) => {
          console.error('Insights API error:', err);
          this.insightsItems = this.parseItems('Unable to generate insights. Please ensure data has been uploaded.', 'insight');
          this.insightsGenerated = true;
          this.insightsLoading = false;
        }
      });
    }

    generateRisks() {
      this.risksLoading = true;
      this.risksGenerated = false;
      const prompt = this.risksCategory === 'csr'
        ? 'Identify and analyze risks in CSR/Sustainability metrics ONLY. Use source=esg only. Do NOT include any HR or workforce data. Highlight critical, high, and medium severity risks.'
        : 'Identify and analyze risks in HR/Workforce metrics ONLY. Use source=dei only. Do NOT include any CSR or sustainability data. Highlight critical, high, and medium severity risks.';
      this.api.chat(prompt).subscribe({
        next: (res) => {
          this.risksItems = this.parseItems(res.response, 'risk');
          this.risksGenerated = true;
          this.risksLoading = false;
        },
        error: (err) => {
          console.error('Risks API error:', err);
          this.risksItems = this.parseItems('Unable to analyze risks. Please ensure data has been uploaded.', 'risk');
          this.risksGenerated = true;
          this.risksLoading = false;
        }
      });
    }

    generateRecommendations() {
      this.recsLoading = true;
      const category = this.recsCategory === 'csr' ? 'CSR/Sustainability' : 'HR/Workforce';
      const source = this.recsCategory === 'csr' ? 'esg' : 'dei';
      const prompt = `Analyze ${category} data (source=${source} only) and provide exactly 5-8 actionable recommendations. ` +
        `For EACH recommendation, output EXACTLY one line in this format:\n` +
        `[PRIORITY] | Recommended action | Department responsible\n\n` +
        `Where PRIORITY is High, Medium, or Low.\n` +
        `Example:\n` +
        `High | Reduce water consumption by 15% at manufacturing plants | Operations\n` +
        `Medium | Launch renewable energy audit across all offices | Facilities\n\n` +
        `Output ONLY the lines in this format, nothing else. No headers, no explanations.`;
      this.api.chat(prompt).subscribe({
        next: (res) => {
          this.recItems = this.parseRecommendations(res.response);
          this.recsGenerated = true;
          this.recsLoading = false;
        },
        error: (err) => {
          console.error('Recommendations API error:', err);
          this.recItems = this.parseRecommendations('Medium | Unable to generate recommendations | System');
          this.recsGenerated = true;
          this.recsLoading = false;
        }
      });
    }

    parseRecommendations(text: string): RecItem[] {
      const iconMap: Record<string, string> = {
        energy: 'bolt', renewable: 'bolt', electricity: 'bolt', solar: 'bolt', power: 'bolt',
        water: 'water_drop', waste: 'delete', recycle: 'recycling',
        carbon: 'cloud', co2: 'cloud', emission: 'cloud', air: 'air',
        hire: 'person_add', hiring: 'person_add', recruit: 'person_add', diversity: 'diversity_3',
        training: 'school', mentor: 'school', upskill: 'school', learn: 'school', education: 'school',
        women: 'female', gender: 'wc', leadership: 'groups',
        safety: 'health_and_safety', health: 'health_and_safety',
        supply: 'local_shipping', transport: 'local_shipping',
        report: 'assessment', audit: 'fact_check', compliance: 'gavel', policy: 'policy',
      };

      const lines = text.split('\n').filter(l => l.trim() && l.includes('|'));
      const items: RecItem[] = [];

      for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 2) continue;

        let priority: RecItem['priority'] = 'Medium';
        const prio = parts[0].replace(/[\*\-\d.]+/g, '').trim().toLowerCase();
        if (prio.includes('high')) priority = 'High';
        else if (prio.includes('low')) priority = 'Low';
        else priority = 'Medium';

        const action = parts[1] || 'Review and take action';
        const department = parts[2] || 'General';

        // Pick icon based on keywords in the action
        let icon = 'task_alt';
        const actionLower = action.toLowerCase();
        for (const [keyword, ic] of Object.entries(iconMap)) {
          if (actionLower.includes(keyword)) { icon = ic; break; }
        }

        items.push({ priority, action, department, icon });
      }

      if (items.length === 0) {
        // Fallback: treat each line as a recommendation
        const fallbackLines = text.split('\n').filter(l => l.trim().length > 15);
        for (const line of fallbackLines.slice(0, 6)) {
          const cleaned = line.replace(/^[\s\-\*•\d.]+/, '').trim();
          let icon = 'task_alt';
          const lower = cleaned.toLowerCase();
          for (const [keyword, ic] of Object.entries(iconMap)) {
            if (lower.includes(keyword)) { icon = ic; break; }
          }
          items.push({
            priority: lower.includes('urgent') || lower.includes('critical') || lower.includes('high') ? 'High' :
                      lower.includes('low') || lower.includes('consider') ? 'Low' : 'Medium',
            action: cleaned.replace(/^\*\*.*?\*\*[:\s]*/, ''),
            department: 'General',
            icon
          });
        }
      }

      return items;
    }

    parseItems(text: string, type: 'risk' | 'insight' | 'recommendation'): ParsedItem[] {
      const lines = text.split('\n').filter(l => l.trim());
      const items: ParsedItem[] = [];
      const iconMap: Record<string, string> = {
        risk: 'warning_amber',
        insight: 'lightbulb',
        recommendation: 'rocket_launch',
      };
      for (const line of lines) {
        const cleaned = line.replace(/^[\s\-\*•\d.]+/, '').trim();
        if (!cleaned || cleaned.length < 10) continue;
        let severity: ParsedItem['severity'] = 'info';
        const lower = cleaned.toLowerCase();
        if (lower.includes('critical') || lower.includes('urgent') || lower.includes('high') || lower.includes('immediately')) {
          severity = 'high';
        } else if (lower.includes('moderate') || lower.includes('medium') || lower.includes('should')) {
          severity = 'medium';
        } else if (lower.includes('low') || lower.includes('minor') || lower.includes('consider')) {
          severity = 'low';
        }
        // Extract bold label if present: **Label:** rest
        const boldMatch = cleaned.match(/^\*\*(.+?)\*\*[:\s]*(.*)/);
        const label = boldMatch ? boldMatch[1] : '';
        const textContent = boldMatch ? boldMatch[2] : cleaned;
        items.push({
          icon: iconMap[type],
          label,
          text: textContent,
          severity
        });
      }
      return items.length > 0 ? items : [{ icon: iconMap[type], label: '', text: text.slice(0, 300), severity: 'info' }];
    }

    getSeverityDist(items: ParsedItem[]): {key: string, label: string, count: number}[] {
      const counts: Record<string, number> = {};
      items.forEach(i => counts[i.severity] = (counts[i.severity] || 0) + 1);
      const labelMap: Record<string, string> = {high: 'High', medium: 'Medium', low: 'Low', info: 'Info'};
      return Object.entries(counts)
        .filter(([_, c]) => c > 0)
        .map(([key, count]) => ({key, label: labelMap[key] || key, count}));
    }

    getPriorityDist(items: RecItem[]): {key: string, label: string, count: number}[] {
      const counts: Record<string, number> = {};
      items.forEach(i => {
        const k = i.priority.toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
      });
      const labelMap: Record<string, string> = {high: 'High', medium: 'Medium', low: 'Low'};
      return Object.entries(counts)
        .filter(([_, c]) => c > 0)
        .map(([key, count]) => ({key, label: labelMap[key] || key, count}));
    }

    getDonutGradient(items: ParsedItem[]): string {
      const colorMap: Record<string, string> = {
        high: '#dc2626', medium: '#d97706', low: '#059669', info: '#4f46e5'
      };
      const dist = this.getSeverityDist(items);
      const total = items.length || 1;
      let deg = 0;
      const stops: string[] = [];
      for (const d of dist) {
        const start = deg;
        deg += (d.count / total) * 360;
        stops.push(`${colorMap[d.key] || '#94a3b8'} ${start}deg ${deg}deg`);
      }
      return stops.length ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    getRecDonutGradient(items: RecItem[]): string {
      const colorMap: Record<string, string> = {high: '#dc2626', medium: '#ea580c', low: '#2563eb'};
      const dist = this.getPriorityDist(items);
      const total = items.length || 1;
      let deg = 0;
      const stops: string[] = [];
      for (const d of dist) {
        const start = deg;
        deg += (d.count / total) * 360;
        stops.push(`${colorMap[d.key] || '#94a3b8'} ${start}deg ${deg}deg`);
      }
      return stops.length ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    getOverallRisk(items: ParsedItem[]): string {
      const high = items.filter(i => i.severity === 'high').length;
      const total = items.length || 1;
      if (high / total > 0.4) return 'high';
      if (high / total > 0.15) return 'medium';
      return 'low';
    }

    loadHealth() {
        this.api.getHealth().subscribe({
            next: (health) => {
                this.health = health;
                this.features = [
                    { name: 'Meeting Summarization', enabled: health.features.deterministic_briefs },
                    { name: 'AI Intelligence', enabled: health.features.ai_briefs },
                    { name: 'Conversational Chat', enabled: health.features.chat },
                    { name: 'RAG (Vector Search)', enabled: health.features.rag },
                    { name: 'Anomaly Detection', enabled: health.features.anomaly_detection }
                ];
            },
            error: () => this.health = null
        });
    }

    loadStats() {
        this.api.getStats().subscribe({
            next: (stats) => {
                this.stats = {
                    esgMetrics: stats.esg_metrics,
                    deiMetrics: stats.dei_metrics,
                    initiatives: stats.initiatives,
                    overdueCount: stats.overdue_count
                };
            },
            error: () => {
                // Keep default zeros on error
            }
        });
    }

    loadLatest() {
        this.api.getLatest().subscribe({
            next: (latest) => this.latestBrief = latest.last_brief_generated,
            error: () => this.latestBrief = null
        });
    }

    applyDateFilter() {
        this.loadESGTrends();
    }

    switchTab(tab: 'weekly' | 'monthly') {
        this.activeTab = tab;
        if (this.analytics) {
            this.buildChart(this.analytics);
        }
    }

    loadESGTrends() {
        this.api.getESGAnalytics(this.dateFrom, this.dateTo).subscribe({
            next: (data) => {
                this.analytics = data;
                const hasWeekly = data.weekly_pct_change?.length > 0;
                const hasMonthly = data.monthly_accumulated?.length > 0;
                if (!hasWeekly && !hasMonthly) return;
                this.hasChartData = true;
                this.trendSummary = {
                    up: (data.weekly_trend || []).filter(t => t.trend === 'up').length,
                    down: (data.weekly_trend || []).filter(t => t.trend === 'down').length,
                    same: (data.weekly_trend || []).filter(t => t.trend === 'same').length,
                };
                this.buildChart(data);
            },
            error: () => {
                this.hasChartData = false;
            }
        });
    }

    detectAnomalies() {
        this.router.navigate(['/chat'], { queryParams: { query: 'Detect anomalies in the metrics data' } });
    }

    askAI(question: string) {
        this.router.navigate(['/chat'], { queryParams: { query: question } });
    }

    private buildChart(data: ESGAnalyticsResponse) {
        this.chart?.destroy();
        const ctx = this.esgChartRef.nativeElement.getContext('2d');
        if (!ctx) return;

        if (this.activeTab === 'weekly') {
            this.buildWeeklyChart(ctx, data);
        } else {
            this.buildMonthlyChart(ctx, data);
        }
    }

    private buildWeeklyChart(ctx: CanvasRenderingContext2D, data: ESGAnalyticsResponse) {
        const items = data.weekly_pct_change || [];
        const labels = items.map(w => `W${w.week} '${String(w.year).slice(2)}`);
        const values = items.map(w => w.pct_change);
        const trends = data.weekly_trend || [];

        const canvasH = ctx.canvas.offsetHeight || 300;
        const canvasW = ctx.canvas.offsetWidth || 600;

        // Wave fill gradient: green above zero, red below
        const fillGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
        fillGrad.addColorStop(0,    'rgba(52, 211, 153, 0.40)');
        fillGrad.addColorStop(0.45, 'rgba(52, 211, 153, 0.08)');
        fillGrad.addColorStop(0.55, 'rgba(251, 113, 133, 0.08)');
        fillGrad.addColorStop(1,    'rgba(251, 113, 133, 0.35)');

        // Line gradient: indigo → cyan across width
        const lineGrad = ctx.createLinearGradient(0, 0, canvasW, 0);
        lineGrad.addColorStop(0,   '#a5b4fc');
        lineGrad.addColorStop(0.5, '#6366f1');
        lineGrad.addColorStop(1,   '#06b6d4');

        // Point colors per trend
        const pointBg = items.map((_, i) => {
            const t = trends[i]?.trend;
            if (t === 'up')   return '#34d399';
            if (t === 'down') return '#fb7185';
            return '#a5b4fc';
        });

        const tickColor = 'rgba(148,163,184,0.7)';
        const gridColor = 'rgba(255,255,255,0.05)';

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: '% Change',
                    data: values,
                    borderColor: lineGrad,
                    backgroundColor: fillGrad,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.5,
                    spanGaps: true,
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    pointBackgroundColor: pointBg,
                    pointBorderColor: 'rgba(15,23,42,0.8)',
                    pointBorderWidth: 2,
                    pointHoverBorderColor: '#e2e8f0',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeInOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(99,102,241,0.4)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            title: (i) => i[0].label,
                            label: (item) => {
                                const val = item.parsed.y;
                                const trend = trends[item.dataIndex]?.trend ?? '';
                                const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
                                if (val === null) return `${arrow}  N/A (baseline week)`;
                                return `${arrow}  ${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: tickColor, font: { size: 12, weight: 500 } }
                    },
                    y: {
                        grid: { color: gridColor, drawTicks: false },
                        border: { display: false },
                        ticks: {
                            color: tickColor,
                            padding: 8,
                            callback: (value) => `${value}%`
                        }
                    }
                }
            }
        });
    }

    private buildMonthlyChart(ctx: CanvasRenderingContext2D, data: ESGAnalyticsResponse) {
        const items = data.monthly_accumulated || [];
        const labels = items.map(m => `${m.month_name.slice(0, 3)} ${m.year}`);
        const values = items.map(m => m.value);

        const canvasH = ctx.canvas.offsetHeight || 360;
        const canvasW = ctx.canvas.offsetWidth || 600;

        const fillGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
        fillGrad.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
        fillGrad.addColorStop(0.65, 'rgba(6, 182, 212, 0.1)');
        fillGrad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        const lineGrad = ctx.createLinearGradient(0, 0, canvasW, 0);
        lineGrad.addColorStop(0, '#6366f1');
        lineGrad.addColorStop(1, '#06b6d4');

        const tickColor = 'rgba(148,163,184,0.7)';
        const gridColor = 'rgba(255,255,255,0.05)';

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Accumulated',
                    data: values,
                    borderColor: lineGrad,
                    backgroundColor: fillGrad,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.42,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#1e1b4b',
                    pointBorderColor: '#a5b4fc',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#6366f1',
                    pointHoverBorderColor: '#e0e7ff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 700, easing: 'easeInOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(99,102,241,0.4)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: (item) => `  Accumulated: ${(item.parsed.y ?? 0).toLocaleString()}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: tickColor, font: { size: 12, weight: 500 } }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: gridColor, drawTicks: false },
                        border: { display: false },
                        ticks: {
                            color: tickColor,
                            padding: 8,
                            callback: (value) => Number(value).toLocaleString()
                        }
                    }
                }
            }
        });
    }
}
