import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { HealthResponse, LatestResponse, ESGAnalyticsResponse, SampleInitiative } from '../../models/api.models';
import { Chart, registerables } from 'chart.js';
import { catchError, map, of } from 'rxjs';

Chart.register(...registerables);

interface AIIntelligenceState {
  risks: string;
  insights: string;
  recommendations: string;
  risksLoading: boolean;
  insightsLoading: boolean;
  recommendationsLoading: boolean;
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
          <p>AI-powered decision support for people, sustainability, initiatives, and leadership action.</p>
        </div>
      </header>

      <!-- Status Cards -->
      <div class="grid grid-4 stats-grid">
        <div class="stat-card">
          <div class="stat-row">
            <div class="stat-icon esg">
              <span class="material-icons">eco</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">Sustainability</span>
              <span class="stat-value">Active</span>
            </div>
          </div>
          <button class="ask-ai-btn" (click)="askAI('What are the latest sustainability metrics and trends?')">
            <span class="material-icons">smart_toy</span> Ask AI
          </button>
        </div>
        
        <div class="stat-card">
          <div class="stat-row">
            <div class="stat-icon dei">
              <span class="material-icons">diversity_3</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">People</span>
              <span class="stat-value">Active</span>
            </div>
          </div>
          <button class="ask-ai-btn" (click)="askAI('What are the latest people and DEI metrics and trends?')">
            <span class="material-icons">smart_toy</span> Ask AI
          </button>
        </div>
        
        <div class="stat-card">
          <div class="stat-row">
            <div class="stat-icon initiatives">
              <span class="material-icons">assignment</span>
            </div>
            <div class="stat-content">
              <span class="stat-label">Active Initiatives</span>
              <span class="stat-value">{{ stats.initiatives }}</span>
            </div>
          </div>
          <button class="ask-ai-btn" (click)="askAI('Give me a summary of all active initiatives, their status and progress')">
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
          <button class="ask-ai-btn" (click)="askAI('Which initiatives are overdue and what actions should leadership take?')">
            <span class="material-icons">smart_toy</span> Ask AI
          </button>
        </div>
      </div>

      <!-- Demo Initiatives Section -->
      <section class="demo-initiatives-section">
        <div class="section-header">
          <div>
            <span class="section-eyebrow">Active Initiatives</span>
            <h2>Key Initiatives Tracked</h2>
          </div>
        </div>
        <div class="initiatives-row">
          <article class="initiative-tile sustainability" *ngFor="let init of sampleInitiatives">
            <div class="initiative-pillar-badge" [ngClass]="init.pillar.toLowerCase()">
              <span class="material-icons">{{ init.pillar === 'Sustainability' ? 'eco' : 'people' }}</span>
              {{ init.pillar }}
            </div>
            <h3>{{ init.name }}</h3>
            <p>{{ init.description }}</p>
            <div class="initiative-meta">
              <span><span class="material-icons">person</span> {{ init.owner }}</span>
              <span><span class="material-icons">event</span> {{ init.due_date }}</span>
            </div>
            <div class="initiative-progress">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="init.progress"></div>
              </div>
              <span class="progress-label">{{ init.progress }}% Complete</span>
            </div>
            <span class="initiative-status" [ngClass]="init.status.toLowerCase().replace(' ', '-')">{{ init.status }}</span>
            <button class="ask-ai-btn" (click)="askAI('Analyze initiative ' + init.id + ' (' + init.name + ') - what is the current status, risks and recommended actions?')" title="Ask AI about this initiative">
              <span class="material-icons">smart_toy</span> Ask AI
            </button>
          </article>
        </div>
      </section>

      <!-- AI Intelligence Section -->
      <section class="ai-intelligence-section">
        <div class="ai-intelligence-header">
          <div>
            <span class="ai-intelligence-eyebrow">
              <span class="material-icons pulse-icon">psychology</span>
              AI Intelligence Engine
            </span>
            <h2>Real-Time AI Analysis</h2>
            <p>GovernIQ analyzes uploaded sustainability, people, and initiative data to generate actionable intelligence.</p>
          </div>
          <button class="btn btn-primary ai-generate-btn" (click)="generateAllIntelligence()" [disabled]="isAnyLoading()">
            <span class="material-icons" [class.spin]="isAnyLoading()">{{ isAnyLoading() ? 'sync' : 'auto_awesome' }}</span>
            {{ isAnyLoading() ? 'Generating...' : 'Generate Intelligence' }}
          </button>
        </div>

        <div class="ai-intelligence-grid">
          <!-- Risk Intelligence Card -->
          <article class="intelligence-card risk-card">
            <div class="intelligence-card-header">
              <div class="intelligence-icon risk">
                <span class="material-icons">warning_amber</span>
              </div>
              <div class="intelligence-title">
                <span class="intelligence-label">Intelligence 1</span>
                <h3>Risk Detection</h3>
              </div>
              <button class="refresh-btn" (click)="loadRisks()" [disabled]="intelligence.risksLoading">
                <span class="material-icons" [class.spin]="intelligence.risksLoading">refresh</span>
              </button>
            </div>
            <div class="intelligence-body">
              <div class="loading-state" *ngIf="intelligence.risksLoading">
                <div class="ai-typing">
                  <span></span><span></span><span></span>
                </div>
                <p>Analyzing sustainability and people data for risks...</p>
              </div>
              <div class="intelligence-content" *ngIf="!intelligence.risksLoading">
                <p style="white-space: pre-line">{{ intelligence.risks }}</p>
              </div>
            </div>
            <div class="intelligence-footer">
              <span class="data-source">Based on: Sustainability metrics, People data, Initiatives</span>
              <button class="ask-ai-btn" (click)="askAI('What are the top risks in our sustainability and people data that leadership should address?')" title="Ask AI about Risks">
                <span class="material-icons">smart_toy</span> Ask AI
              </button>
            </div>
          </article>

          <!-- Insights Intelligence Card -->
          <article class="intelligence-card insight-card">
            <div class="intelligence-card-header">
              <div class="intelligence-icon insight">
                <span class="material-icons">lightbulb</span>
              </div>
              <div class="intelligence-title">
                <span class="intelligence-label">Intelligence 2</span>
                <h3>Insights Generation</h3>
              </div>
              <button class="refresh-btn" (click)="loadInsights()" [disabled]="intelligence.insightsLoading">
                <span class="material-icons" [class.spin]="intelligence.insightsLoading">refresh</span>
              </button>
            </div>
            <div class="intelligence-body">
              <div class="loading-state" *ngIf="intelligence.insightsLoading">
                <div class="ai-typing">
                  <span></span><span></span><span></span>
                </div>
                <p>Connecting metrics with initiatives and campaigns...</p>
              </div>
              <div class="intelligence-content" *ngIf="!intelligence.insightsLoading">
                <p style="white-space: pre-line">{{ intelligence.insights }}</p>
              </div>
            </div>
            <div class="intelligence-footer">
              <span class="data-source">Based on: Trends, Correlations, Patterns</span>
              <button class="ask-ai-btn" (click)="askAI('What insights and patterns can you find across our sustainability metrics, people data and initiatives?')" title="Ask AI about Insights">
                <span class="material-icons">smart_toy</span> Ask AI
              </button>
            </div>
          </article>

          <!-- Recommendations Intelligence Card -->
          <article class="intelligence-card recommendation-card">
            <div class="intelligence-card-header">
              <div class="intelligence-icon recommendation">
                <span class="material-icons">rocket_launch</span>
              </div>
              <div class="intelligence-title">
                <span class="intelligence-label">Intelligence 3</span>
                <h3>Recommendations</h3>
              </div>
              <button class="refresh-btn" (click)="loadRecommendations()" [disabled]="intelligence.recommendationsLoading">
                <span class="material-icons" [class.spin]="intelligence.recommendationsLoading">refresh</span>
              </button>
            </div>
            <div class="intelligence-body">
              <div class="loading-state" *ngIf="intelligence.recommendationsLoading">
                <div class="ai-typing">
                  <span></span><span></span><span></span>
                </div>
                <p>Prioritizing leadership actions...</p>
              </div>
              <div class="intelligence-content" *ngIf="!intelligence.recommendationsLoading">
                <p style="white-space: pre-line">{{ intelligence.recommendations }}</p>
              </div>
            </div>
            <div class="intelligence-footer">
              <span class="data-source">Based on: Priorities, Impact, Resources</span>
              <button class="ask-ai-btn" (click)="askAI('What are the top priority recommendations for leadership based on current data and initiatives?')" title="Ask AI about Recommendations">
                <span class="material-icons">smart_toy</span> Ask AI
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- ESG Trends Chart -->
      <div class="ai-chart-card">
        <div class="ai-glow-orb"></div>
        <div class="ai-chart-header">
          <div class="ai-chart-title">
            <div>
              <h3>Sustainability Trends Analysis</h3>
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
          <p>No sustainability data in this range</p>
          <small>Adjust the date filters or upload sustainability data first</small>
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

    // AI Intelligence State
    intelligence: AIIntelligenceState = {
      risks: 'Click "Generate Intelligence" to analyze risks from your uploaded sustainability, people, and initiatives data.',
      insights: 'AI will identify patterns and connections across your sustainability metrics, people data, and active initiatives.',
      recommendations: 'Leadership action recommendations will be generated based on current priorities and data trends.',
      risksLoading: false,
      insightsLoading: false,
      recommendationsLoading: false
    };

    // Sample Initiatives for Demo
    sampleInitiatives: SampleInitiative[] = [
      {
        id: 'INIT-SUS-1',
        name: 'Renewable Energy Transition',
        owner: 'Maria Garcia',
        pillar: 'Sustainability',
        status: 'In Progress',
        due_date: '2026-06-30',
        description: 'Transition 50% of facilities to renewable energy sources including solar and wind power installations.',
        progress: 45
      },
      {
        id: 'INIT-PEO-1',
        name: 'AI Ready Workforce Program',
        owner: 'James Wilson',
        pillar: 'People',
        status: 'In Progress',
        due_date: '2026-09-15',
        description: 'Upskill workforce with AI literacy, tools training, and hands-on labs to prepare teams for AI-augmented workflows.',
        progress: 30
      }
    ];

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
        // Auto-generate intelligence on load
        this.generateAllIntelligence();
    }

    ngOnDestroy() {
        this.chart?.destroy();
    }

    // AI Intelligence Methods
    isAnyLoading(): boolean {
      return this.intelligence.risksLoading || this.intelligence.insightsLoading || this.intelligence.recommendationsLoading;
    }

    generateAllIntelligence() {
      this.loadRisks();
      this.loadInsights();
      this.loadRecommendations();
    }

    loadRisks() {
      this.intelligence.risksLoading = true;
      this.api.getRisks().pipe(
        map(response => response.risks || 'No significant risks detected in current data.'),
        catchError(() => of('Unable to analyze risks. Please ensure data has been uploaded.'))
      ).subscribe(result => {
        this.intelligence.risks = result;
        this.intelligence.risksLoading = false;
      });
    }

    loadInsights() {
      this.intelligence.insightsLoading = true;
      this.api.getInsights().pipe(
        map(response => response.insights || 'No significant insights available from current data.'),
        catchError(() => of('Unable to generate insights. Please ensure data has been uploaded.'))
      ).subscribe(result => {
        this.intelligence.insights = result;
        this.intelligence.insightsLoading = false;
      });
    }

    loadRecommendations() {
      this.intelligence.recommendationsLoading = true;
      this.api.getRecommendations().pipe(
        map(response => response.recommendations || 'No recommendations available. Please upload more data.'),
        catchError(() => of('Unable to generate recommendations. Please ensure data has been uploaded.'))
      ).subscribe(result => {
        this.intelligence.recommendations = result;
        this.intelligence.recommendationsLoading = false;
      });
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
        this.generateAllIntelligence();
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
