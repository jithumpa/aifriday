"""
Agentic AI - ReAct Agent for Governance Insights
Uses OpenAI GPT-4o with function calling for multi-step reasoning
"""
from __future__ import annotations
import httpx
from openai import OpenAI
from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, MAX_AGENT_ITERATIONS
from tools import TOOL_DEFINITIONS, execute_tool
from vector_store import search_documents
import json
import datetime

client = None

def get_client():
    global client
    if client is None:
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable not set. Please set it to use AI features.")
        # Use custom httpx client with SSL verification disabled for corporate environments
        http_client = httpx.Client(verify=False, timeout=120.0)
        client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL, http_client=http_client)
    return client


SYSTEM_PROMPT = """You are GovernIQ, a CSR & HR Governance Insights Agent for TCS Mexico.

IMPORTANT DATA CATEGORIES:
- CSR / Sustainability data is stored with source="esg". When asked about CSR, ONLY query source="esg".
- HR / Workforce data is stored with source="dei". When asked about HR or Workforce, ONLY query source="dei".
- NEVER mix these categories. If the user asks about CSR, do NOT include HR/DEI metrics. If the user asks about HR, do NOT include ESG/CSR metrics.

Your role is to:
1. Analyze CSR (sustainability, environment, governance) metrics (source=esg)
2. Analyze HR / Workforce metrics (source=dei)
3. Track campaigns and flag overdue or at-risk items
4. Identify trends, anomalies, and data gaps
5. Generate executive briefs with evidence-backed insights

When generating insights:
- Always cite your sources with evidence (e.g., "source: metrics id 5" or "source: campaign INIT-2")
- Be concise but comprehensive
- Prioritize actionable insights
- Flag risks prominently
- Suggest specific next actions with owners and due dates
- Respect the category boundary: CSR queries → source=esg only, HR queries → source=dei only

You have access to tools to query the database, search meeting notes, and compute analytics.
Use the tools to gather data before making conclusions.
"""


def run_agent(user_query: str, context: dict = None) -> dict:
    """
    Run the ReAct agent loop:
    1. Receive user query
    2. Reason about what tools to call
    3. Execute tools
    4. Observe results
    5. Repeat or generate final response
    """
    try:
        openai_client = get_client()
    except ValueError as e:
        return {
            "success": False,
            "error": str(e),
            "response": "AI features require an OpenAI API key. Please set OPENAI_API_KEY environment variable."
        }
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]
    
    # Add context if provided
    if context:
        context_str = f"Current date: {context.get('date', datetime.date.today())}\n"
        if context.get('week_start'):
            context_str += f"Analyzing week starting: {context['week_start']}\n"
        if context.get('data_summary'):
            context_str += (
                "\n--- CURRENT DATA IN DATABASE ---\n"
                f"{context['data_summary']}\n"
                "--- END DATA ---\n"
                "Use this data as primary context. You can also call tools for deeper analysis.\n"
            )
        messages.append({"role": "system", "content": context_str})
    
    messages.append({"role": "user", "content": user_query})
    
    tool_calls_made = []
    iterations = 0
    
    while iterations < MAX_AGENT_ITERATIONS:
        iterations += 1
        
        # Call OpenAI with tools
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto"
        )
        
        assistant_message = response.choices[0].message
        messages.append(assistant_message)
        
        # Check if we need to call tools
        if assistant_message.tool_calls:
            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                
                # Execute the tool
                result = execute_tool(tool_name, arguments)
                tool_calls_made.append({
                    "tool": tool_name,
                    "arguments": arguments,
                    "result_summary": f"{len(str(result))} chars"
                })
                
                # Add tool result to messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result)
                })
        else:
            # No more tool calls, we have the final response
            return {
                "success": True,
                "response": assistant_message.content,
                "tool_calls": tool_calls_made,
                "iterations": iterations
            }
    
    # Max iterations reached
    return {
        "success": True,
        "response": messages[-1].content if hasattr(messages[-1], 'content') else "Analysis completed.",
        "tool_calls": tool_calls_made,
        "iterations": iterations,
        "warning": "Max iterations reached"
    }


def generate_ai_brief(week_start_date: datetime.date) -> dict:
    """Generate an AI-powered weekly executive brief"""
    
    prompt = f"""Generate a comprehensive Weekly Executive Brief for the week of {week_start_date.isoformat()}.

Structure the brief with these sections:
1. **Highlights** - Key positive developments and achievements
2. **Risks & Blockers** - Overdue initiatives, declining metrics, at-risk items
3. **Decisions Needed** - Items requiring executive decision
4. **Top 5 Next Actions** - Specific actions with owner and due date suggestions

For each bullet point, include evidence citations like (source: metrics id X) or (source: initiative INIT-X).

First, use the available tools to:
1. Query all metrics to understand current performance
2. Find overdue and at-risk initiatives
3. Compute metric trends
4. Check for data gaps
5. Search meeting notes for relevant context

Then synthesize the findings into an executive-ready brief."""

    context = {
        "date": datetime.date.today(),
        "week_start": week_start_date.isoformat()
    }
    
    return run_agent(prompt, context)


def chat_query(question: str, data_context: str = None) -> dict:
    """Handle a conversational query about governance data"""
    
    context = {
        "date": datetime.date.today()
    }
    if data_context:
        context["data_summary"] = data_context
    
    return run_agent(question, context)


def analyze_initiative(initiative_id: str) -> dict:
    """Deep dive analysis on a specific initiative"""
    
    prompt = f"""Provide a detailed analysis of initiative {initiative_id}.

Include:
1. Current status and progress
2. Risk assessment
3. Related metrics (if any)
4. Relevant context from meeting notes
5. Recommended actions

Use the available tools to gather all relevant information."""
    
    return run_agent(prompt)


def detect_and_explain_anomalies() -> dict:
    """Detect anomalies and provide explanations"""
    
    prompt = """Detect any anomalies in the metrics data and provide explanations.

For each anomaly found:
1. Describe what's unusual
2. Provide possible explanations
3. Search meeting notes for context
4. Suggest follow-up actions

Use the detect_anomalies tool first, then investigate each finding."""
    
    return run_agent(prompt)


def generate_dashboard_intelligence(as_of_date: datetime.date | None = None) -> dict:
    """
    Generate structured dashboard intelligence with three sections:
    risks, insights, and recommendations.
    """
    if as_of_date is None:
        as_of_date = datetime.date.today()

    prompt = f"""Generate dashboard intelligence for sustainability, people, and initiatives as of {as_of_date.isoformat()}.

You MUST return valid JSON only with this schema:
{{
  "risks": ["..."],
  "insights": ["..."],
  "recommendations": ["..."]
}}

Rules:
- Return exactly these 3 top-level keys.
- Each list should contain 3 to 5 concise bullet-style strings.
- Cover sustainability metrics, people/DEI metrics, and initiatives.
- Include specific evidence references in each item, for example: (source: metrics id 12) or (source: initiative INIT-2).

Before answering, use tools to:
1. Query ESG metrics
2. Query DEI metrics
3. Query overdue and at-risk initiatives
4. Detect anomalies and data gaps
5. Search notes for decision context
"""

    result = run_agent(
        prompt,
        context={
            "date": as_of_date.isoformat()
        }
    )

    if not result.get("success"):
        return result

    raw = (result.get("response") or "").strip()

    # Some models wrap JSON in code fences; strip if present.
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except Exception:
        return {
            "success": False,
            "error": "Model response was not valid JSON for intelligence output.",
            "response": result.get("response"),
            "tool_calls": result.get("tool_calls", []),
            "iterations": result.get("iterations", 0)
        }

    return {
        "success": True,
        "intelligence": {
            "risks": parsed.get("risks", []),
            "insights": parsed.get("insights", []),
            "recommendations": parsed.get("recommendations", [])
        },
        "tool_calls": result.get("tool_calls", []),
        "iterations": result.get("iterations", 0)
    }
