# Governance Dashboard

Angular frontend for the Sustainability + DEI Governance Insights Agent.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server (with proxy to FastAPI backend):
```bash
npm start
```

3. Open http://localhost:4200

## Prerequisites

- Make sure the FastAPI backend is running on http://localhost:8000
- The proxy configuration will forward `/api/*` requests to the backend

## Features

- **Dashboard** - Overview of governance metrics and status
- **Data Ingestion** - Upload ESG, DEI, Initiatives CSVs and meeting notes
- **Weekly Brief** - Generate deterministic or AI-powered executive briefs
- **AI Chat** - Conversational interface to query governance data
- **Initiatives** - Track and analyze sustainability/DEI initiatives

## Tech Stack

- Angular 17 (Standalone Components)
- Chart.js for visualizations
- Material Icons
- SCSS styling
