# Sustainability + DEI Governance Insights Agent v2.0

**Agentic AI-powered governance insights with RAG and multi-step reasoning**

## Features

✅ **Deterministic Analysis** - Rule-based metrics analysis, trend detection, anomaly detection  
✅ **AI-Powered Briefs** - GPT-4o generates executive summaries with evidence citations  
✅ **Conversational Chat** - Ask questions about your governance data  
✅ **RAG (Retrieval-Augmented Generation)** - Meeting notes indexed for context  
✅ **Multi-Step Reasoning** - Agent uses tools to gather data before conclusions  
✅ **Evidence-Backed** - Every insight includes source citations  

## Quickstart

1) Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

2) Set your OpenAI API key (for AI features):
   ```powershell
   $env:OPENAI_API_KEY = "sk-your-key-here"
   ```

3) Run the FastAPI app:
   ```powershell
   python -m uvicorn main:app --reload
   ```

4) Open docs at http://localhost:8000/docs

## API Endpoints

### Data Ingestion
- `POST /esg` - Upload ESG metrics CSV
- `POST /dei` - Upload DEI metrics CSV  
- `POST /initiatives` - Upload initiatives CSV
- `POST /notes` - Upload meeting notes (indexed for RAG)

### Brief Generation
- `POST /generate?week_start=YYYY-MM-DD` - Deterministic brief
- `POST /generate?week_start=YYYY-MM-DD&use_ai=true` - AI-powered brief

### Agentic AI (NEW!)
- `POST /chat` - Conversational queries (e.g., "Why is INIT-2 at risk?")
- `GET /analyze/initiative/{id}` - Deep dive on an initiative
- `GET /analyze/anomalies` - Detect and explain anomalies
- `GET /intelligence/dashboard` - Dashboard intelligence JSON with `risks`, `insights`, `recommendations`

### Demo Utilities
- `POST /demo/seed-initiatives` - Seed 1 sustainability + 1 people initiative for demo

### Status
- `GET /health` - Health check with feature flags
- `GET /latest` - Last brief timestamp

## Example Commands (PowerShell)

```powershell
# Ingest sample data
curl.exe -X POST "http://localhost:8000/esg" -F "file=@sample_data/esg_metrics.csv"
curl.exe -X POST "http://localhost:8000/dei" -F "file=@sample_data/dei_metrics.csv"
curl.exe -X POST "http://localhost:8000/initiatives" -F "file=@sample_data/initiatives.csv"

# Generate deterministic brief
curl.exe -X POST "http://localhost:8000/generate?week_start=2026-03-01"

# Generate AI-powered brief (requires OPENAI_API_KEY)
curl.exe -X POST "http://localhost:8000/generate?week_start=2026-03-01&use_ai=true"

# Chat with the agent
curl.exe -X POST "http://localhost:8000/chat" -H "Content-Type: application/json" -d "{\"question\": \"What are the top risks this week?\"}"

# Analyze specific initiative
curl.exe "http://localhost:8000/analyze/initiative/INIT-2"

# Detect anomalies
curl.exe "http://localhost:8000/analyze/anomalies"

# Seed demo initiatives (1 sustainability + 1 people)
curl.exe -X POST "http://localhost:8000/demo/seed-initiatives"

# Dashboard intelligence for frontend cards
curl.exe "http://localhost:8000/intelligence/dashboard?use_ai=true"
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Server                        │
├─────────────────────────────────────────────────────────┤
│  Data Ingestion    │  Brief Generation  │  Agentic AI   │
│  - ESG CSV         │  - Deterministic   │  - Chat       │
│  - DEI CSV         │  - AI-powered      │  - Analysis   │
│  - Initiatives     │                    │  - Anomalies  │
│  - Notes (RAG)     │                    │               │
├─────────────────────────────────────────────────────────┤
│                    Agent Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Tools   │  │  OpenAI  │  │  Vector  │              │
│  │  (6)     │  │  GPT-4o  │  │  Store   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
├─────────────────────────────────────────────────────────┤
│  SQLite Database              │  ChromaDB (RAG)         │
│  - metrics                    │  - meeting_notes        │
│  - initiatives                │  - historical_briefs    │
│  - notes                      │                         │
│  - briefs                     │                         │
└─────────────────────────────────────────────────────────┘
```

## Agent Tools

The AI agent has access to these tools for multi-step reasoning:

| Tool | Description |
|------|-------------|
| `query_metrics` | Query ESG/DEI metrics with filters |
| `query_initiatives` | Find overdue/at-risk initiatives |
| `search_notes` | Semantic search over meeting notes |
| `compute_metric_trend` | Week-over-week trend analysis |
| `detect_anomalies` | Statistical anomaly detection |
| `get_data_gaps` | Identify missing data |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required for AI) | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | Model to use (gpt-4o, gpt-4, gpt-3.5-turbo) |
| `DATABASE_URL` | `sqlite:///governance.db` | Database connection string |

## TODOs
- [ ] Authentication and role-based access control
- [ ] PDF export for briefs
- [ ] Scheduled brief generation
- [ ] Slack/Teams integration
- [ ] Custom dashboards

Sample data is under `sample_data/`
