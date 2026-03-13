// API Response Models

export interface HealthResponse {
    status: string;
    version: string;
    features: {
        deterministic_briefs: boolean;
        ai_briefs: boolean;
        chat: boolean;
        rag: boolean;
        anomaly_detection: boolean;
    };
}

export interface UploadResponse {
    status: string;
    ingested_rows?: number;
    note_id?: number;
}

export interface BriefResponse {
    status: string;
    brief: string;
    tool_calls?: ToolCall[];
    iterations?: number;
    mode: 'deterministic' | 'ai';
}

export interface ChatRequest {
    question: string;
}

export interface ChatResponse {
    success: boolean;
    response: string;
    tool_calls: ToolCall[];
    iterations: number;
    error?: string;
}

export interface ToolCall {
    tool: string;
    arguments: Record<string, unknown>;
    result_summary: string;
}

export interface LatestResponse {
    last_brief_generated: string | null;
}

export interface Initiative {
    id: string;
    name: string;
    owner: string;
    pillar: string;
    status: string;
    due_date: string | null;
    last_update: string | null;
    is_overdue?: boolean;
}

export interface Metric {
    id: number;
    source: 'esg' | 'dei';
    date: string;
    org_unit: string;
    metric_name: string;
    value: number;
    unit: string;
}

export interface AnalysisResponse {
    success: boolean;
    response: string;
    tool_calls: ToolCall[];
    iterations: number;
}

export interface ESGAnalyticsResponse {
    avg_daily: number;
    max: number;
    min: number;
    weekly_trend: { year: number; week: number; trend: string }[];
    weekly_pct_change: { year: number; week: number; pct_change: number | null }[];
    monthly_accumulated: { year: number; month: number; month_name: string; value: number }[];
}

export interface AnomalyResponse {
    success: boolean;
    response: string;
    tool_calls: ToolCall[];
}

// AI Intelligence Models for GovernIQ
export interface AIIntelligenceRequest {
    pillar: 'sustainability' | 'people' | 'initiatives' | 'all';
    date_range?: { start: string; end: string };
}

export interface RiskIntelligence {
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affected_area: string;
    recommended_action: string;
}

export interface InsightIntelligence {
    category: string;
    title: string;
    description: string;
    metrics_involved: string[];
    trend: 'positive' | 'negative' | 'neutral';
}

export interface RecommendationIntelligence {
    priority: 'urgent' | 'high' | 'medium';
    title: string;
    description: string;
    initiative_link?: string;
    expected_impact: string;
}

export interface AIIntelligenceResponse {
    success: boolean;
    risks: RiskIntelligence[];
    insights: InsightIntelligence[];
    recommendations: RecommendationIntelligence[];
    summary: string;
    generated_at: string;
}

// Sample Initiatives for Demo
export interface SampleInitiative {
    id: string;
    name: string;
    owner: string;
    pillar: 'Sustainability' | 'People' | 'Governance';
    status: string;
    due_date: string;
    description: string;
    progress: number;
}
