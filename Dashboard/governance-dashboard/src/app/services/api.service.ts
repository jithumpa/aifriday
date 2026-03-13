import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    HealthResponse,
    UploadResponse,
    BriefResponse,
    ChatRequest,
    ChatResponse,
    LatestResponse,
    AnalysisResponse,
    AnomalyResponse,
    ESGAnalyticsResponse,
    AIIntelligenceRequest,
    AIIntelligenceResponse
} from '../models/api.models';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private baseUrl = '/api';

    constructor(private http: HttpClient) { }

    // Health check
    getHealth(): Observable<HealthResponse> {
        return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
    }

    // Dashboard stats
    getStats(): Observable<{ esg_metrics: number; dei_metrics: number; initiatives: number; overdue_count: number }> {
        return this.http.get<{ esg_metrics: number; dei_metrics: number; initiatives: number; overdue_count: number }>(`${this.baseUrl}/stats`);
    }

    // Latest brief timestamp
    getLatest(): Observable<LatestResponse> {
        return this.http.get<LatestResponse>(`${this.baseUrl}/latest`);
    }

    // Data Ingestion
    uploadESG(file: File): Observable<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<UploadResponse>(`${this.baseUrl}/esg`, formData);
    }

    uploadDEI(file: File): Observable<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<UploadResponse>(`${this.baseUrl}/dei`, formData);
    }

    uploadInitiatives(file: File): Observable<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<UploadResponse>(`${this.baseUrl}/initiatives`, formData);
    }

    uploadNotes(text: string, source: string = 'meeting_notes.txt'): Observable<UploadResponse> {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('source', source);
        return this.http.post<UploadResponse>(`${this.baseUrl}/notes`, formData);
    }

    // Brief Generation
    generateBrief(weekStart: string, useAI: boolean = false): Observable<BriefResponse> {
        return this.http.post<BriefResponse>(
            `${this.baseUrl}/generate?week_start=${weekStart}&use_ai=${useAI}`,
            {}
        );
    }

    // Agentic AI - Chat
    chat(question: string): Observable<ChatResponse> {
        const request: ChatRequest = { question };
        return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, request);
    }

    // Agentic AI - Analyze Initiative
    analyzeInitiative(initiativeId: string): Observable<AnalysisResponse> {
        return this.http.get<AnalysisResponse>(`${this.baseUrl}/analyze/initiative/${initiativeId}`);
    }

    // Agentic AI - Detect Anomalies
    detectAnomalies(): Observable<AnomalyResponse> {
        return this.http.get<AnomalyResponse>(`${this.baseUrl}/analyze/anomalies`);
    }

    // ESG Analytics
    getESGAnalytics(startDate: string, endDate: string): Observable<ESGAnalyticsResponse> {
        return this.http.get<ESGAnalyticsResponse>(
            `${this.baseUrl}/metrics/esg/analytics?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
        );
    }

    // AI Intelligence - Generate comprehensive intelligence from uploaded data
    generateIntelligence(pillar: string = 'all'): Observable<AIIntelligenceResponse> {
        return this.http.post<AIIntelligenceResponse>(
            `${this.baseUrl}/intelligence/generate`,
            { pillar }
        );
    }

    // AI Intelligence - Get risks analysis
    getRisks(pillar: string = 'all'): Observable<{ success: boolean; risks: string; raw_response: string }> {
        return this.http.post<{ success: boolean; risks: string; raw_response: string }>(
            `${this.baseUrl}/intelligence/risks`,
            { pillar }
        );
    }

    // AI Intelligence - Get insights analysis
    getInsights(pillar: string = 'all'): Observable<{ success: boolean; insights: string; raw_response: string }> {
        return this.http.post<{ success: boolean; insights: string; raw_response: string }>(
            `${this.baseUrl}/intelligence/insights`,
            { pillar }
        );
    }

    // AI Intelligence - Get recommendations
    getRecommendations(pillar: string = 'all'): Observable<{ success: boolean; recommendations: string; raw_response: string }> {
        return this.http.post<{ success: boolean; recommendations: string; raw_response: string }>(
            `${this.baseUrl}/intelligence/recommendations`,
            { pillar }
        );
    }

    // Get initiatives list
    getInitiatives(): Observable<{ initiatives: any[] }> {
        return this.http.get<{ initiatives: any[] }>(`${this.baseUrl}/initiatives`);
    }

    // List available meeting notes (with optional date filter)
    listNotes(date?: string): Observable<{ notes: { id: number; date: string; title: string; source: string }[]; available_dates: string[] }> {
        const url = date
            ? `${this.baseUrl}/notes/list?date=${encodeURIComponent(date)}`
            : `${this.baseUrl}/notes/list`;
        return this.http.get<{ notes: { id: number; date: string; title: string; source: string }[]; available_dates: string[] }>(url);
    }

    // Summarize a single meeting note by id or raw text
    summarize(noteId?: number, text?: string): Observable<{ success: boolean; summary: string }> {
        const body: any = {};
        if (noteId) body.note_id = noteId;
        if (text) body.text = text;
        return this.http.post<{ success: boolean; summary: string }>(
            `${this.baseUrl}/summarize`,
            body
        );
    }

    // ---- File-based meeting notes ----

    // Upload meeting notes to a date folder
    uploadNotesToFolder(text: string, date: string, title: string): Observable<{ status: string; date: string; file: string }> {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('date', date);
        formData.append('title', title);
        return this.http.post<{ status: string; date: string; file: string }>(`${this.baseUrl}/notes/file-upload`, formData);
    }

    // Get all dates that have meeting notes
    getNoteDates(): Observable<{ dates: string[] }> {
        return this.http.get<{ dates: string[] }>(`${this.baseUrl}/notes/dates`);
    }

    // Get meeting notes for a specific date
    getNotesByDate(date: string): Observable<{ date: string; notes: { filename: string; title: string; preview: string; content: string }[] }> {
        return this.http.get<{ date: string; notes: { filename: string; title: string; preview: string; content: string }[] }>(
            `${this.baseUrl}/notes/by-date/${encodeURIComponent(date)}`
        );
    }

    // Summarize a file-based meeting note
    summarizeFileNote(date: string, filename: string): Observable<{ success: boolean; summary: string }> {
        const formData = new FormData();
        formData.append('date', date);
        formData.append('filename', filename);
        return this.http.post<{ success: boolean; summary: string }>(`${this.baseUrl}/notes/summarize-file`, formData);
    }

    // Get initiatives list from DB
    getInitiativesList(): Observable<{ initiatives: any[] }> {
        return this.http.get<{ initiatives: any[] }>(`${this.baseUrl}/initiatives/list`);
    }

    // Reset all data
    resetData(): Observable<{ status: string; deleted: any; message: string }> {
        return this.http.delete<{ status: string; deleted: any; message: string }>(`${this.baseUrl}/data/reset`);
    }
}
