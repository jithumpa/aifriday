"""
Agent Tools - Functions the AI agent can call to gather information
"""
from db import SessionLocal
from models import Metric, Initiative, Note
from vector_store import search_documents
import pandas as pd
import datetime
import json

# Tool definitions for OpenAI function calling
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "query_metrics",
            "description": "Query ESG or DEI metrics from the database. Use this to get metric values, trends, and data for analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "enum": ["esg", "dei", "all"],
                        "description": "Filter by metric source: 'esg', 'dei', or 'all'"
                    },
                    "metric_name": {
                        "type": "string",
                        "description": "Optional: filter by specific metric name (e.g., 'CO2 Emissions', 'Gender Balance')"
                    },
                    "org_unit": {
                        "type": "string",
                        "description": "Optional: filter by organization unit (e.g., 'Europe', 'Global')"
                    },
                    "days_back": {
                        "type": "integer",
                        "description": "Number of days to look back from today. Default is 30."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_initiatives",
            "description": "Query initiatives from the database. Use this to find overdue, at-risk, or in-progress initiatives.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "overdue", "at_risk", "in_progress", "done"],
                        "description": "Filter by status. 'overdue' returns items past due date that aren't done."
                    },
                    "pillar": {
                        "type": "string",
                        "description": "Optional: filter by pillar (e.g., 'Packaging', 'HR', 'Supply Chain')"
                    },
                    "owner": {
                        "type": "string",
                        "description": "Optional: filter by owner name"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_notes",
            "description": "Search meeting notes and historical documents using semantic search. Use this to find context about decisions, blockers, or discussions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query - what you're looking for in the notes"
                    },
                    "n_results": {
                        "type": "integer",
                        "description": "Number of results to return. Default is 5."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compute_metric_trend",
            "description": "Compute week-over-week trend for a specific metric. Returns percentage change and direction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "metric_name": {
                        "type": "string",
                        "description": "The metric name to analyze"
                    },
                    "org_unit": {
                        "type": "string",
                        "description": "The organization unit to analyze"
                    }
                },
                "required": ["metric_name", "org_unit"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "detect_anomalies",
            "description": "Detect anomalies or unusual patterns in metrics data. Returns metrics that deviate significantly from historical averages.",
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold": {
                        "type": "number",
                        "description": "Standard deviation threshold for anomaly detection. Default is 2.0"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_data_gaps",
            "description": "Identify missing data or gaps in metric reporting for the recent period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days_back": {
                        "type": "integer",
                        "description": "Number of days to check for gaps. Default is 7."
                    }
                },
                "required": []
            }
        }
    }
]


# Tool implementations
def query_metrics(source: str = "all", metric_name: str = None, org_unit: str = None, days_back: int = 30):
    """Query metrics from database"""
    db = SessionLocal()
    try:
        q = db.query(Metric)
        if source and source != "all":
            q = q.filter(Metric.source == source)
        if metric_name:
            q = q.filter(Metric.metric_name.ilike(f"%{metric_name}%"))
        if org_unit:
            q = q.filter(Metric.org_unit.ilike(f"%{org_unit}%"))
        
        cutoff = datetime.date.today() - datetime.timedelta(days=days_back)
        q = q.filter(Metric.date >= cutoff)
        
        rows = q.order_by(Metric.date.desc()).limit(100).all()
        results = []
        for r in rows:
            results.append({
                "id": r.id,
                "source": r.source,
                "date": str(r.date),
                "org_unit": r.org_unit,
                "metric_name": r.metric_name,
                "value": r.value,
                "unit": r.unit
            })
        return {"count": len(results), "metrics": results}
    finally:
        db.close()


def query_initiatives(status: str = "all", pillar: str = None, owner: str = None):
    """Query initiatives from database"""
    db = SessionLocal()
    try:
        q = db.query(Initiative)
        
        if pillar:
            q = q.filter(Initiative.pillar.ilike(f"%{pillar}%"))
        if owner:
            q = q.filter(Initiative.owner.ilike(f"%{owner}%"))
        
        rows = q.all()
        results = []
        today = datetime.date.today()
        
        for r in rows:
            is_overdue = r.due_date and r.due_date < today and r.status.lower() != 'done'
            is_at_risk = r.status.lower() == 'at risk'
            
            # Apply status filter
            if status == "overdue" and not is_overdue:
                continue
            if status == "at_risk" and not is_at_risk:
                continue
            if status == "in_progress" and r.status.lower() != 'in progress':
                continue
            if status == "done" and r.status.lower() != 'done':
                continue
            
            results.append({
                "id": r.id,
                "name": r.name,
                "owner": r.owner,
                "pillar": r.pillar,
                "status": r.status,
                "due_date": str(r.due_date) if r.due_date else None,
                "last_update": str(r.last_update) if r.last_update else None,
                "is_overdue": is_overdue
            })
        
        return {"count": len(results), "initiatives": results}
    finally:
        db.close()


def search_notes(query: str, n_results: int = 5):
    """Search meeting notes using vector search"""
    try:
        results = search_documents(query, n_results)
        if results and results.get('documents'):
            docs = results['documents'][0] if results['documents'] else []
            metas = results['metadatas'][0] if results.get('metadatas') else []
            return {
                "count": len(docs),
                "results": [{"text": doc, "metadata": meta} for doc, meta in zip(docs, metas)]
            }
        return {"count": 0, "results": []}
    except Exception as e:
        # Fallback to DB search if vector store fails
        db = SessionLocal()
        try:
            notes = db.query(Note).filter(Note.content.ilike(f"%{query}%")).limit(n_results).all()
            return {
                "count": len(notes),
                "results": [{"text": n.content, "metadata": {"source": n.source}} for n in notes]
            }
        finally:
            db.close()


def compute_metric_trend(metric_name: str, org_unit: str):
    """Compute week-over-week trend for a metric"""
    db = SessionLocal()
    try:
        today = datetime.date.today()
        recent_start = today - datetime.timedelta(days=7)
        prev_start = today - datetime.timedelta(days=14)
        
        recent = db.query(Metric).filter(
            Metric.metric_name.ilike(f"%{metric_name}%"),
            Metric.org_unit.ilike(f"%{org_unit}%"),
            Metric.date > recent_start
        ).all()
        
        prev = db.query(Metric).filter(
            Metric.metric_name.ilike(f"%{metric_name}%"),
            Metric.org_unit.ilike(f"%{org_unit}%"),
            Metric.date > prev_start,
            Metric.date <= recent_start
        ).all()
        
        if not recent or not prev:
            return {"error": "Insufficient data for trend analysis", "metric": metric_name, "org_unit": org_unit}
        
        recent_avg = sum(r.value for r in recent) / len(recent)
        prev_avg = sum(r.value for r in prev) / len(prev)
        
        if prev_avg == 0:
            change_pct = 0
        else:
            change_pct = ((recent_avg - prev_avg) / prev_avg) * 100
        
        return {
            "metric": metric_name,
            "org_unit": org_unit,
            "recent_avg": round(recent_avg, 2),
            "previous_avg": round(prev_avg, 2),
            "change_percent": round(change_pct, 2),
            "direction": "increasing" if change_pct > 0 else "decreasing" if change_pct < 0 else "stable",
            "evidence_ids": [r.id for r in recent + prev]
        }
    finally:
        db.close()


def detect_anomalies(threshold: float = 2.0):
    """Detect anomalies in metrics data"""
    db = SessionLocal()
    try:
        metrics = db.query(Metric).all()
        if not metrics:
            return {"anomalies": []}
        
        # Group by metric_name and org_unit
        from collections import defaultdict
        groups = defaultdict(list)
        for m in metrics:
            groups[(m.metric_name, m.org_unit)].append(m)
        
        anomalies = []
        for (metric_name, org_unit), items in groups.items():
            if len(items) < 3:
                continue
            
            values = [i.value for i in items]
            mean = sum(values) / len(values)
            variance = sum((v - mean) ** 2 for v in values) / len(values)
            std = variance ** 0.5
            
            if std == 0:
                continue
            
            for item in items:
                z_score = abs(item.value - mean) / std
                if z_score > threshold:
                    anomalies.append({
                        "id": item.id,
                        "metric": metric_name,
                        "org_unit": org_unit,
                        "value": item.value,
                        "date": str(item.date),
                        "z_score": round(z_score, 2),
                        "expected_range": f"{round(mean - threshold*std, 2)} - {round(mean + threshold*std, 2)}"
                    })
        
        return {"count": len(anomalies), "anomalies": anomalies}
    finally:
        db.close()


def get_data_gaps(days_back: int = 7):
    """Identify data gaps in recent reporting"""
    db = SessionLocal()
    try:
        today = datetime.date.today()
        recent_start = today - datetime.timedelta(days=days_back)
        
        # Get all unique metric/org combinations
        all_metrics = db.query(Metric.metric_name, Metric.org_unit).distinct().all()
        recent_metrics = db.query(Metric.metric_name, Metric.org_unit).filter(
            Metric.date > recent_start
        ).distinct().all()
        
        all_set = set(all_metrics)
        recent_set = set(recent_metrics)
        missing = all_set - recent_set
        
        gaps = [{"metric": m[0], "org_unit": m[1], "last_seen": "more than 7 days ago"} for m in missing]
        
        return {"count": len(gaps), "gaps": gaps}
    finally:
        db.close()


# Tool executor
def execute_tool(tool_name: str, arguments: dict):
    """Execute a tool by name with given arguments"""
    tools = {
        "query_metrics": query_metrics,
        "query_initiatives": query_initiatives,
        "search_notes": search_notes,
        "compute_metric_trend": compute_metric_trend,
        "detect_anomalies": detect_anomalies,
        "get_data_gaps": get_data_gaps
    }
    
    if tool_name not in tools:
        return {"error": f"Unknown tool: {tool_name}"}
    
    try:
        result = tools[tool_name](**arguments)
        return result
    except Exception as e:
        return {"error": str(e)}
