from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Path, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from models import Base, Metric, Initiative, Note, Brief
from db import engine, SessionLocal
from ingest import ingest_metrics_csv, ingest_initiatives_csv, ingest_notes
from brief import generate_weekly_brief
from pydantic import BaseModel
from typing import Optional
import datetime
import pandas as pd
import os

# Import agentic features
from agent import (
    generate_ai_brief,
    chat_query,
    analyze_initiative,
    detect_and_explain_anomalies,
    generate_dashboard_intelligence,
)
from vector_store import add_meeting_notes, add_brief_to_store

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sustainability + DEI Governance Insights Agent",
    description="Agentic AI-powered governance insights with RAG and multi-step reasoning",
    version="2.0.0"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]) 


# Pydantic models for API
class LatestResponse(BaseModel):
    last_brief_generated: datetime.datetime | None

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    success: bool
    response: str
    tool_calls: list = []
    iterations: int = 0
    error: Optional[str] = None

class StatsResponse(BaseModel):
    esg_metrics: int
    dei_metrics: int
    initiatives: int
    overdue_count: int


class DashboardIntelligenceResponse(BaseModel):
    success: bool
    mode: str
    as_of_date: str
    risks: list[str]
    insights: list[str]
    recommendations: list[str]
    tool_calls: list = []
    iterations: int = 0
    error: Optional[str] = None


# ============ DATA INGESTION ENDPOINTS ============

@app.post('/esg', tags=["Data Ingestion"])
async def upload_esg(file: UploadFile = File(...)):
    """Upload ESG metrics CSV file"""
    try:
        count = ingest_metrics_csv(file, 'esg')
        return {"status":"ok","ingested_rows":count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/dei', tags=["Data Ingestion"])
async def upload_dei(file: UploadFile = File(...)):
    """Upload DEI metrics CSV file"""
    try:
        count = ingest_metrics_csv(file, 'dei')
        return {"status":"ok","ingested_rows":count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/initiatives', tags=["Data Ingestion"])
async def upload_initiatives(file: UploadFile = File(...)):
    """Upload initiatives CSV file"""
    try:
        count = ingest_initiatives_csv(file)
        return {"status":"ok","ingested_rows":count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/notes', tags=["Data Ingestion"])
async def upload_notes(text: str = Form(...), source: str = Form('meeting_notes.txt')):
    """Upload meeting notes text (also indexed for RAG)"""
    try:
        note_id = ingest_notes(text, source)
        # Also add to vector store for RAG
        try:
            add_meeting_notes(text, source, note_id)
        except Exception:
            pass  # Vector store is optional
        return {"status":"ok", "note_id": note_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ BRIEF GENERATION ENDPOINTS ============

@app.post('/generate', tags=["Brief Generation"])
async def generate(week_start: str, use_ai: bool = False):
    """
    Generate weekly executive brief.
    
    - use_ai=False: Deterministic rule-based brief (default)
    - use_ai=True: AI-powered brief using GPT-4o with multi-step reasoning
    """
    try:
        dt = datetime.datetime.fromisoformat(week_start)
    except Exception:
        raise HTTPException(status_code=400, detail='week_start must be YYYY-MM-DD')
    
    if use_ai:
        # AI-powered brief generation
        result = generate_ai_brief(dt.date())
        if result["success"]:
            # Store brief in DB
            db = SessionLocal()
            try:
                b = Brief(week_start=dt.date(), content_md=result["response"])
                db.add(b)
                db.commit()
                # Also add to vector store
                try:
                    add_brief_to_store(result["response"], dt.date().isoformat(), b.id)
                except:
                    pass
            finally:
                db.close()
        return JSONResponse(content={
            "status": "ok" if result["success"] else "error",
            "brief": result["response"],
            "tool_calls": result.get("tool_calls", []),
            "iterations": result.get("iterations", 0),
            "mode": "ai"
        })
    else:
        # Deterministic brief
        brief = generate_weekly_brief(dt.date())
        return JSONResponse(content={"status":"ok","brief":brief, "mode": "deterministic"})


# ============ AGENTIC AI ENDPOINTS ============

@app.post('/chat', tags=["Agentic AI"], response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the AI agent about governance data.
    
    Examples:
    - "Why is INIT-2 at risk?"
    - "What are our top ESG concerns this week?"
    - "Show me DEI trends for Europe"
    - "Who owns the most overdue initiatives?"
    """
    data_summary = _get_data_summary()
    result = chat_query(request.question, data_context=data_summary)
    return ChatResponse(
        success=result["success"],
        response=result["response"],
        tool_calls=result.get("tool_calls", []),
        iterations=result.get("iterations", 0),
        error=result.get("error")
    )

@app.get('/analyze/initiative/{initiative_id}', tags=["Agentic AI"])
async def analyze_init(initiative_id: str):
    """
    Deep dive analysis on a specific initiative.
    
    Returns AI-generated analysis with:
    - Current status and progress
    - Risk assessment
    - Related metrics
    - Context from meeting notes
    - Recommended actions
    """
    result = analyze_initiative(initiative_id)
    return JSONResponse(content=result)

@app.get('/analyze/anomalies', tags=["Agentic AI"])
async def analyze_anomalies():
    """
    Detect and explain anomalies in metrics data.
    
    Uses AI to:
    - Identify unusual patterns
    - Provide explanations
    - Search for context
    - Suggest follow-up actions
    """
    result = detect_and_explain_anomalies()
    return JSONResponse(content=result)


def _deterministic_dashboard_intelligence(as_of_date: datetime.date) -> dict:
    """Fallback intelligence when AI is unavailable."""
    db = SessionLocal()
    try:
        recent_cutoff = as_of_date - datetime.timedelta(days=30)

        recent_metrics = db.query(Metric).filter(Metric.date >= recent_cutoff).all()
        all_inits = db.query(Initiative).all()

        risks = []
        insights = []
        recommendations = []

        # Risks from initiatives
        overdue_items = []
        for i in all_inits:
            if i.due_date and i.due_date < as_of_date and (i.status or "").lower() not in ["done", "completed", "closed"]:
                overdue_items.append(i)

        at_risk_items = [i for i in all_inits if (i.status or "").lower() == "at risk"]

        for item in overdue_items[:3]:
            risks.append(
                f"Overdue initiative: {item.id} {item.name} (owner: {item.owner}, due: {item.due_date}) (source: initiative {item.id})"
            )
        for item in at_risk_items[:2]:
            risks.append(
                f"At-risk initiative: {item.id} {item.name} (owner: {item.owner}) (source: initiative {item.id})"
            )

        # Insights from metrics
        esg = [m for m in recent_metrics if m.source == 'esg']
        dei = [m for m in recent_metrics if m.source == 'dei']

        if esg:
            latest_esg = sorted(esg, key=lambda x: x.date, reverse=True)[:1]
            if latest_esg:
                m = latest_esg[0]
                insights.append(
                    f"Latest sustainability signal: {m.metric_name} in {m.org_unit} is {m.value} {m.unit} on {m.date} (source: metrics id {m.id})"
                )

        if dei:
            latest_dei = sorted(dei, key=lambda x: x.date, reverse=True)[:1]
            if latest_dei:
                m = latest_dei[0]
                insights.append(
                    f"Latest people signal: {m.metric_name} in {m.org_unit} is {m.value} {m.unit} on {m.date} (source: metrics id {m.id})"
                )

        if all_inits:
            insights.append(
                f"Initiatives tracked: {len(all_inits)} total, {len(overdue_items)} overdue, {len(at_risk_items)} at risk (source: initiatives)"
            )

        # Recommendations
        recommendations.append(
            "Run weekly risk review for overdue or at-risk initiatives with named owners and next checkpoint dates."
        )
        recommendations.append(
            "Prioritize one sustainability and one people initiative for executive follow-up in this week demo narrative."
        )
        recommendations.append(
            "Validate data freshness for ESG and DEI metrics every 7 days to avoid blind spots in dashboard intelligence."
        )

        return {
            "success": True,
            "mode": "deterministic",
            "as_of_date": as_of_date.isoformat(),
            "risks": risks[:5],
            "insights": insights[:5],
            "recommendations": recommendations[:5],
            "tool_calls": [],
            "iterations": 0,
            "error": None,
        }
    finally:
        db.close()


@app.get('/intelligence/dashboard', tags=["Agentic AI"], response_model=DashboardIntelligenceResponse)
async def dashboard_intelligence(
    as_of_date: str = Query(None, description="Date in YYYY-MM-DD format"),
    use_ai: bool = Query(True, description="Use AI model call for intelligence generation"),
):
    """
    Generate intelligence payload for dashboard with 3 sections:
    - risks
    - insights
    - recommendations
    """
    try:
        dt = datetime.date.fromisoformat(as_of_date) if as_of_date else datetime.date.today()
    except Exception:
        raise HTTPException(status_code=400, detail='as_of_date must be YYYY-MM-DD')

    if use_ai:
        ai_result = generate_dashboard_intelligence(dt)
        if ai_result.get("success"):
            intelligence = ai_result.get("intelligence", {})
            return DashboardIntelligenceResponse(
                success=True,
                mode="ai",
                as_of_date=dt.isoformat(),
                risks=intelligence.get("risks", []),
                insights=intelligence.get("insights", []),
                recommendations=intelligence.get("recommendations", []),
                tool_calls=ai_result.get("tool_calls", []),
                iterations=ai_result.get("iterations", 0),
                error=None,
            )

        fallback = _deterministic_dashboard_intelligence(dt)
        fallback["mode"] = "deterministic_fallback"
        fallback["error"] = ai_result.get("error", "AI intelligence generation failed")
        return DashboardIntelligenceResponse(**fallback)

    deterministic = _deterministic_dashboard_intelligence(dt)
    return DashboardIntelligenceResponse(**deterministic)


# ============ DEDICATED INTELLIGENCE ENDPOINTS ============

class IntelligenceRequest(BaseModel):
    pillar: str = "all"


def _get_data_summary() -> str:
    """Fetch a summary of all uploaded data for intelligence generation."""
    db = SessionLocal()
    try:
        esg_metrics = db.query(Metric).filter(Metric.source == 'esg').order_by(Metric.date.desc()).limit(50).all()
        dei_metrics = db.query(Metric).filter(Metric.source == 'dei').order_by(Metric.date.desc()).limit(50).all()
        initiatives = db.query(Initiative).all()
        notes = db.query(Note).limit(10).all()

        parts = []

        if esg_metrics:
            parts.append("=== ESG / SUSTAINABILITY METRICS (most recent) ===")
            for m in esg_metrics:
                parts.append(f"  [id:{m.id}] {m.date} | {m.org_unit} | {m.metric_name}: {m.value} {m.unit}")
        else:
            parts.append("=== ESG METRICS === No ESG data uploaded yet.")

        if dei_metrics:
            parts.append("\n=== DEI / PEOPLE METRICS (most recent) ===")
            for m in dei_metrics:
                parts.append(f"  [id:{m.id}] {m.date} | {m.org_unit} | {m.metric_name}: {m.value} {m.unit}")
        else:
            parts.append("\n=== DEI METRICS === No DEI data uploaded yet.")

        if initiatives:
            parts.append("\n=== INITIATIVES ===")
            today = datetime.date.today()
            for i in initiatives:
                is_overdue = (
                    i.due_date
                    and i.due_date < today
                    and (i.status or "").lower() not in ["done", "completed", "closed"]
                )
                marker = " ** OVERDUE **" if is_overdue else ""
                parts.append(
                    f"  [{i.id}] {i.name} | Owner: {i.owner} | Pillar: {i.pillar} "
                    f"| Status: {i.status} | Due: {i.due_date}{marker}"
                )
        else:
            parts.append("\n=== INITIATIVES === No initiatives uploaded yet.")

        if notes:
            parts.append("\n=== MEETING NOTES (latest) ===")
            for n in notes:
                preview = (n.content or "")[:300]
                parts.append(f"  [source: {n.source}] {preview}")

        return "\n".join(parts)
    finally:
        db.close()


_INTELLIGENCE_SYSTEM = (
    "You are GovernIQ, an AI-powered governance intelligence engine for a large corporation. "
    "You analyze sustainability (ESG), people (DEI), and initiative data to provide actionable intelligence for leadership. "
    "Be concise, specific, and always reference actual data values and initiative IDs when available. "
    "If no data has been uploaded yet, say so clearly and suggest uploading data first."
)

_INTELLIGENCE_PROMPTS = {
    "risks": (
        "Analyze the following governance data and identify the TOP 3-5 RISKS that leadership should be aware of.\n\n"
        "DATA:\n{data}\n\n"
        "Focus on:\n"
        "- ESG metrics with negative trends or concerning values (e.g. rising emissions, declining renewable energy)\n"
        "- DEI metrics that show gaps or concerning patterns (e.g. low representation, declining engagement)\n"
        "- Initiatives that are OVERDUE or AT RISK\n"
        "- Data gaps or missing reporting periods\n\n"
        "For each risk provide: a clear risk statement, severity (High/Medium/Low), "
        "supporting data evidence with specific values and IDs, and what could happen if unaddressed.\n"
        "Format as numbered items. Be direct and actionable."
    ),
    "insights": (
        "Analyze the following governance data and generate 3-5 KEY INSIGHTS that reveal patterns, connections, and trends.\n\n"
        "DATA:\n{data}\n\n"
        "Focus on:\n"
        "- How ESG metrics relate to sustainability initiatives\n"
        "- How DEI metrics connect to people/HR initiatives\n"
        "- Cross-pillar patterns (e.g. sustainability efforts impacting team engagement)\n"
        "- Trends over time — what is improving, what is declining\n"
        "- Connections between different metrics and initiatives\n\n"
        "For each insight provide: a clear insight statement, supporting evidence with specific data values, "
        "and the 'so what' — why this matters for leadership.\n"
        "Format as numbered items. Be specific."
    ),
    "recommendations": (
        "Based on the following governance data, provide 3-5 PRIORITIZED RECOMMENDATIONS for leadership action.\n\n"
        "DATA:\n{data}\n\n"
        "Focus on:\n"
        "- Which initiatives need immediate attention and why\n"
        "- Actions to accelerate positive trends or mitigate identified risks\n"
        "- Resource allocation priorities\n"
        "- Quick wins vs. strategic long-term moves\n\n"
        "For each recommendation provide: a clear action statement, priority (Urgent/High/Medium), "
        "expected impact, suggested owner, and timeline.\n"
        "Format as numbered items. Be actionable and specific."
    ),
}


def _call_intelligence(prompt_type: str, data_summary: str) -> dict:
    """Make a direct GPT call for intelligence generation with pre-fetched data."""
    import httpx
    from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL

    user_prompt = _INTELLIGENCE_PROMPTS.get(prompt_type, _INTELLIGENCE_PROMPTS["risks"]).format(data=data_summary)

    try:
        from agent import get_client
        openai_client = get_client()
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": _INTELLIGENCE_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        return {"success": True, "response": response.choices[0].message.content}
    except Exception as e:
        return {"success": False, "response": f"AI analysis unavailable: {e}", "error": str(e)}


def _deterministic_intelligence(prompt_type: str) -> str:
    """Fallback plain-text intelligence when AI is unavailable."""
    det = _deterministic_dashboard_intelligence(datetime.date.today())
    mapping = {
        "risks": det.get("risks", []),
        "insights": det.get("insights", []),
        "recommendations": det.get("recommendations", []),
    }
    items = mapping.get(prompt_type, [])
    if not items:
        return "No data available yet. Please upload ESG, DEI, or Initiatives data first."
    return "\n".join(f"• {item}" for item in items)


@app.post('/intelligence/risks', tags=["Intelligence"])
async def intelligence_risks(request: IntelligenceRequest = IntelligenceRequest()):
    """Analyze uploaded data and return risk intelligence."""
    data_summary = _get_data_summary()
    result = _call_intelligence("risks", data_summary)
    response_text = result["response"] if result["success"] else _deterministic_intelligence("risks")
    return {"success": True, "risks": response_text, "raw_response": response_text}


@app.post('/intelligence/insights', tags=["Intelligence"])
async def intelligence_insights(request: IntelligenceRequest = IntelligenceRequest()):
    """Analyze uploaded data and return insight intelligence."""
    data_summary = _get_data_summary()
    result = _call_intelligence("insights", data_summary)
    response_text = result["response"] if result["success"] else _deterministic_intelligence("insights")
    return {"success": True, "insights": response_text, "raw_response": response_text}


@app.post('/intelligence/recommendations', tags=["Intelligence"])
async def intelligence_recommendations(request: IntelligenceRequest = IntelligenceRequest()):
    """Analyze uploaded data and return recommendation intelligence."""
    data_summary = _get_data_summary()
    result = _call_intelligence("recommendations", data_summary)
    response_text = result["response"] if result["success"] else _deterministic_intelligence("recommendations")
    return {"success": True, "recommendations": response_text, "raw_response": response_text}


@app.post('/demo/seed-initiatives', tags=["Data Ingestion"])
async def seed_demo_initiatives():
    """
    Seed two demo initiatives:
    - One sustainability initiative
    - One people initiative
    """
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        records = [
            Initiative(
                id="INIT-SUS-1",
                name="Sustainability Packaging Reduction Sprint",
                owner="Mark Tan",
                pillar="Sustainability",
                status="At Risk",
                due_date=(datetime.date.today() + datetime.timedelta(days=10)),
                last_update=now,
                raw_row="demo_seed",
            ),
            Initiative(
                id="INIT-PEO-1",
                name="People Inclusive Leadership Program",
                owner="Anna Lee",
                pillar="People",
                status="In Progress",
                due_date=(datetime.date.today() + datetime.timedelta(days=14)),
                last_update=now,
                raw_row="demo_seed",
            ),
        ]

        for record in records:
            db.merge(record)

        db.commit()
        return {
            "status": "ok",
            "seeded": [r.id for r in records],
            "message": "Demo initiatives ready: 1 sustainability and 1 people"
        }
    finally:
        db.close()


# ============ METRICS ENDPOINT ============

@app.get('/metrics/{metric_type}', tags=["Metrics"])
async def get_metrics(metric_type: str = Path(..., regex="^(dei|esg|initiatives)$")):
    """
    Get metrics data from CSV files. metric_type can be 'dei', 'esg', or 'initiatives'.
    Returns the CSV content as JSON, formatted for frontend Metric interface.
    """
    base_path = os.path.join(os.path.dirname(__file__), 'sample_data')
    file_map = {
        'dei': 'dei_metrics.csv',
        'esg': 'esg_metrics.csv',
    }
    if metric_type not in file_map:
        raise HTTPException(status_code=404, detail="Invalid metric type")
    file_path = os.path.join(base_path, file_map[metric_type])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    df = pd.read_csv(file_path)
    # Add an auto-incremental id for frontend compatibility
    df = df.reset_index().rename(columns={'index': 'id'})
    df['source'] = metric_type
    # Ensure correct types for frontend
    df['id'] = df['id'].astype(int)
    df['value'] = df['value'].astype(float)
    # Only return the required fields for the Metric interface
    result = df[['id', 'source', 'date', 'org_unit', 'metric_name', 'value', 'unit']].to_dict(orient='records')
    return result

@app.get('/metrics/esg/analytics', tags=["Metrics"])
async def esg_analytics(
    start_date: str = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(None, description="End date in YYYY-MM-DD format")
):
    """
    Analytics for ESG CO2 Emissions:
    - Promedio diario de emisiones en un rango de fechas.
    - Tendencia (incremento o decremento) semana a semana.
    - Máximo y mínimo en el periodo.
    - Reducción porcentual entre semanas consecutivas.
    - Acumulado mensual de emisiones.
    - Predicción para los próximos 7 días.
    """
    import pandas as pd
    import numpy as np
    from datetime import datetime
    import calendar
    import os

    base_path = os.path.join(os.path.dirname(__file__), 'sample_data')
    file_path = os.path.join(base_path, 'esg_metrics.csv')
    df = pd.read_csv(file_path, parse_dates=['date'])

    # Filter by date range if provided
    if start_date:
        df = df[df['date'] >= pd.to_datetime(start_date)]
    if end_date:
        df = df[df['date'] <= pd.to_datetime(end_date)]

    # Promedio diario
    avg_daily = df['value'].mean() if not df.empty else None

    # Máximo y mínimo
    max_value = df['value'].max() if not df.empty else None
    min_value = df['value'].min() if not df.empty else None

    # Agrupar por semana (ISO week)
    if not df.empty:
        df['week'] = df['date'].dt.isocalendar().week
        df['year'] = df['date'].dt.isocalendar().year
        weekly = df.groupby(['year', 'week'])['value'].sum().reset_index()
        weekly = weekly.sort_values(['year', 'week'])
    else:
        weekly = pd.DataFrame(columns=['year', 'week', 'value'])

    # Tendencia semana a semana
    if not weekly.empty:
        weekly['trend'] = weekly['value'].diff().apply(lambda x: 'up' if x > 0 else ('down' if x < 0 else 'same'))
        trend = weekly[['year', 'week', 'trend']].to_dict(orient='records')
        # Reducción porcentual entre semanas consecutivas
        weekly['pct_change'] = weekly['value'].pct_change().apply(lambda x: round(x*100,2) if pd.notnull(x) else None)
        pct_changes = weekly[['year', 'week', 'pct_change']].to_dict(orient='records')
    else:
        trend = []
        pct_changes = []

    # Acumulado mensual
    if not df.empty:
        df['month'] = df['date'].dt.month
        df['year'] = df['date'].dt.year
        monthly = df.groupby(['year', 'month'])['value'].sum().reset_index()
        monthly['month_name'] = monthly['month'].apply(lambda m: calendar.month_name[m])
        monthly_acc = monthly[['year', 'month', 'month_name', 'value']].to_dict(orient='records')
    else:
        monthly_acc = []

    # Convert all values to native Python types for JSON serialization
    def to_native(val):
        if pd.isnull(val):
            return None
        if isinstance(val, (np.generic, np.int64, np.float64)):
            return val.item()
        return val

    avg_daily = to_native(avg_daily)
    max_value = to_native(max_value)
    min_value = to_native(min_value)
    trend = [
        {k: to_native(v) for k, v in rec.items()} for rec in trend
    ]
    pct_changes = [
        {k: to_native(v) for k, v in rec.items()} for rec in pct_changes
    ]
    monthly_acc = [
        {k: to_native(v) for k, v in rec.items()} for rec in monthly_acc
    ]

    # === Forecasting: Linear Regression for next 7 days ===
    predicted = []
    try:
        from sklearn.linear_model import LinearRegression
        if not df.empty:
            # Prepare data for regression: use date as ordinal for X
            df_sorted = df.sort_values('date')
            X = df_sorted['date'].map(datetime.toordinal).values.reshape(-1, 1)
            y = df_sorted['value'].values
            model = LinearRegression()
            model.fit(X, y)
            # Predict next 7 days
            last_date = df_sorted['date'].max()
            next_days = [last_date + pd.Timedelta(days=i) for i in range(1, 8)]
            X_pred = [d.toordinal() for d in next_days]
            y_pred = model.predict(np.array(X_pred).reshape(-1, 1))
            predicted = [
                {'date': d.strftime('%Y-%m-%d'), 'predicted_value': float(round(v, 2))}
                for d, v in zip(next_days, y_pred)
            ]
    except Exception as e:
        predicted = []  # If forecasting fails, return empty

    return {
        'avg_daily': avg_daily,
        'max': max_value,
        'min': min_value,
        'weekly_trend': trend,
        'weekly_pct_change': pct_changes,
        'monthly_accumulated': monthly_acc,
        'predicted': predicted
    }


# ============ STATUS ENDPOINTS ============

@app.get('/latest', tags=["Status"], response_model=LatestResponse)
async def latest():
    """Get timestamp of last generated brief"""
    db = SessionLocal()
    try:
        b = db.query(Brief).order_by(Brief.created_at.desc()).first()
        return {"last_brief_generated": b.created_at if b else None}
    finally:
        db.close()

@app.get('/health', tags=["Status"])
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "features": {
            "deterministic_briefs": True,
            "ai_briefs": True,
            "chat": True,
            "rag": True,
            "anomaly_detection": True
        }
    }

@app.get('/stats', tags=["Status"], response_model=StatsResponse)
async def get_stats():
    """Get dashboard statistics"""
    db = SessionLocal()
    try:
        esg_count = db.query(Metric).filter(Metric.source == 'esg').count()
        dei_count = db.query(Metric).filter(Metric.source == 'dei').count()
        init_count = db.query(Initiative).count()
        
        # Count overdue initiatives
        today = datetime.date.today()
        overdue = db.query(Initiative).filter(
            Initiative.due_date < today.isoformat(),
            Initiative.status.notin_(['Completed', 'Done', 'Closed'])
        ).count()
        
        return StatsResponse(
            esg_metrics=esg_count,
            dei_metrics=dei_count,
            initiatives=init_count,
            overdue_count=overdue
        )
    finally:
        db.close()

@app.get('/latest', tags=["Status"])
async def latest():
    """Get the timestamp of the last generated brief"""
    db = SessionLocal()
    try:
        b = db.query(Brief).order_by(Brief.created_at.desc()).first()
        return {"last_brief_generated": b.created_at if b else None}
    finally:
        db.close()
