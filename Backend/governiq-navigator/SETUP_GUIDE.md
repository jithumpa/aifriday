# Governance Dashboard - Full Stack Setup Guide

## Quick Start

### 1. Start the Backend (FastAPI)

```powershell
cd "C:\Users\GENAIMXCDMXUSR34\Desktop\GovernIQ Navigator"

# Install dependencies
pip install -r requirements.txt

# Set OpenAI API key (for AI features)
$env:OPENAI_API_KEY = "sk-your-key-here"

# Start the server
python -m uvicorn main:app --reload --port 8000
```

### 2. Start the Frontend (Angular)

```powershell
cd "C:\Users\GENAIMXCDMXUSR34\Desktop\governance-dashboard"

# Install dependencies
npm install

# Start dev server (proxies to backend)
npm start
```

### 3. Access the Application

- **Frontend Dashboard**: http://localhost:4200
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Health**: http://localhost:8000/health

## Test the Full Flow

1. Open http://localhost:4200
2. Go to **Data Ingestion** tab
3. Upload the sample CSVs from `GovernIQ Navigator/sample_data/`
4. Go to **Weekly Brief** tab
5. Generate a brief (deterministic or AI-powered)
6. Go to **AI Chat** tab
7. Ask questions like "What are the overdue initiatives?"

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/esg` | POST | Upload ESG metrics CSV |
| `/dei` | POST | Upload DEI metrics CSV |
| `/initiatives` | POST | Upload initiatives CSV |
| `/notes` | POST | Upload meeting notes |
| `/generate` | POST | Generate weekly brief |
| `/chat` | POST | AI chat query |
| `/analyze/initiative/{id}` | GET | Analyze specific initiative |
| `/analyze/anomalies` | GET | Detect anomalies |
| `/latest` | GET | Get last brief timestamp |
