from db import SessionLocal
from models import Metric, Initiative, Note, Brief
import datetime
from collections import defaultdict
import pandas as pd


def _get_metrics_df(source=None):
    db = SessionLocal()
    try:
        q = db.query(Metric)
        if source:
            q = q.filter(Metric.source==source)
        rows = q.all()
        data = [dict(id=r.id, source=r.source, date=r.date, org_unit=r.org_unit, metric_name=r.metric_name, value=r.value, unit=r.unit) for r in rows]
        if not data:
            return pd.DataFrame()
        return pd.DataFrame(data)
    finally:
        db.close()


def _get_initiatives_df():
    db = SessionLocal()
    try:
        rows = db.query(Initiative).all()
        data = [dict(id=r.id, name=r.name, owner=r.owner, pillar=r.pillar, status=r.status, due_date=r.due_date, last_update=r.last_update) for r in rows]
        if not data:
            return pd.DataFrame()
        return pd.DataFrame(data)
    finally:
        db.close()


def _evidence_for_metric_row(row):
    return f"(source: metrics id {row['id']})"


def _evidence_for_initiative(row):
    return f"(source: initiatives id {row['id']})"


def compute_overdue_initiatives(df_inits, today=None):
    if today is None:
        today = datetime.date.today()
    if df_inits.empty:
        return []
    overdue = df_inits[(df_inits['due_date'].notnull()) & (df_inits['due_date'] < today) & (df_inits['status'].str.lower()!='done')]
    bullets = []
    for _, r in overdue.iterrows():
        bullets.append({'text': f"{r['id']}: {r['name']} (owner: {r['owner']}) due {r['due_date']}", 'evidence': _evidence_for_initiative(r)})
    return bullets


def compute_metric_trends(df_metrics, lookback_days=14, today=None):
    if today is None:
        today = datetime.date.today()
    if df_metrics.empty:
        return []
    df = df_metrics.copy()
    df['date'] = pd.to_datetime(df['date']).dt.date
    start = today - datetime.timedelta(days=lookback_days)
    recent = df[df['date'] > today - datetime.timedelta(days=7)]
    prev = df[(df['date'] <= today - datetime.timedelta(days=7)) & (df['date'] > start)]
    out = []
    for (org, metric), grp in pd.concat([recent, prev]).groupby(['org_unit','metric_name']):
        recent_vals = recent[(recent['org_unit']==org)&(recent['metric_name']==metric)]['value']
        prev_vals = prev[(prev['org_unit']==org)&(prev['metric_name']==metric)]['value']
        if recent_vals.empty or prev_vals.empty:
            continue
        recent_mean = recent_vals.mean()
        prev_mean = prev_vals.mean()
        change = (recent_mean - prev_mean)/prev_mean if prev_mean!=0 else None
        text = f"{metric} for {org}: {recent_mean:.2f} vs {prev_mean:.2f}"
        if change is not None:
            text += f" ({change:+.1%} change)"
        # gather evidence ids
        ids = df[(df['org_unit']==org)&(df['metric_name']==metric)]['id'].tolist()
        ev = ','.join(str(i) for i in ids)
        out.append({'text': text, 'evidence': f"(source: metrics ids {ev})"})
    return out


def compute_data_gaps(df_metrics, recent_week_start=None, today=None):
    if today is None:
        today = datetime.date.today()
    if recent_week_start is None:
        recent_week_start = today - datetime.timedelta(days=7)
    if df_metrics.empty:
        return []
    df = df_metrics.copy()
    df['date'] = pd.to_datetime(df['date']).dt.date
    week = df[df['date'] > recent_week_start]
    # find expected metrics per org_unit from historical data
    expected = df.groupby('metric_name')['org_unit'].nunique()
    gaps = []
    for metric in df['metric_name'].unique():
        orgs_with = week[week['metric_name']==metric]['org_unit'].unique()
        historical_orgs = df[df['metric_name']==metric]['org_unit'].unique()
        missing = set(historical_orgs) - set(orgs_with)
        if missing:
            gaps.append({'text': f"Missing metric {metric} for org_units: {', '.join(missing)}", 'evidence': f"(source: metrics)"})
    return gaps


def generate_weekly_brief(week_start_date):
    # week_start_date is a date
    df_all = _get_metrics_df()
    df_esg = _get_metrics_df('esg')
    df_dei = _get_metrics_df('dei')
    df_inits = _get_initiatives_df()

    highlights = []
    risks = []
    decisions = []
    actions = []

    # compute signals
    overdue = compute_overdue_initiatives(df_inits, today=week_start_date + datetime.timedelta(days=6))
    trends_esg = compute_metric_trends(df_esg, today=week_start_date + datetime.timedelta(days=6))
    trends_dei = compute_metric_trends(df_dei, today=week_start_date + datetime.timedelta(days=6))
    gaps = compute_data_gaps(df_all, recent_week_start=week_start_date)

    # build sections
    if trends_esg:
        highlights.append({'text': 'ESG trends', 'items': trends_esg})
    if trends_dei:
        highlights.append({'text': 'DEI trends', 'items': trends_dei})
    if overdue:
        risks.append({'text': 'Overdue initiatives', 'items': overdue})

    # decisions: use simple heuristics
    if overdue:
        decisions.append('Decide on resource re-allocation for overdue initiatives ' + ', '.join([o['text'] for o in overdue[:3]]))
    if gaps:
        decisions.append('Confirm owners to fill data gaps for latest week')

    # actions: top 5 suggested next actions from overdue and gaps and top declining metrics
    for o in overdue[:5]:
        actions.append({'text': f"Follow up with {o['text']}", 'suggested_owner': o['text'].split('owner:')[-1].split(')')[0].strip(), 'due': (week_start_date + datetime.timedelta(days=7)).isoformat(), 'evidence': o['evidence']})
    # add some metric-based actions
    for t in (trends_esg+trends_dei)[:5-len(actions)]:
        actions.append({'text': f"Investigate trend: {t['text']}", 'suggested_owner': 'Analytics Team', 'due': (week_start_date + datetime.timedelta(days=14)).isoformat(), 'evidence': t['evidence']})

    # assemble markdown
    md = []
    md.append(f"# Weekly Executive Brief — week of {week_start_date.isoformat()}\n")
    md.append("## Highlights")
    if highlights:
        for h in highlights:
            md.append(f"### {h['text']}")
            for it in h['items']:
                md.append(f"- {it['text']} {it['evidence']}")
    else:
        md.append("- No highlights for this week.")

    md.append("\n## Risks & Blockers")
    if risks:
        for r in risks:
            md.append(f"### {r['text']}")
            for it in r['items']:
                md.append(f"- {it['text']} {it['evidence']}")
    else:
        md.append("- No risks identified.")

    md.append("\n## Decisions Needed")
    if decisions:
        for d in decisions:
            md.append(f"- {d}")
    else:
        md.append("- No decisions needed this week.")

    md.append("\n## Top 5 Next Actions")
    if actions:
        for a in actions[:5]:
            md.append(f"- {a['text']} (owner: {a['suggested_owner']}) due {a['due']} {a.get('evidence','')}")
    else:
        md.append("- No actions suggested.")

    content = "\n".join(md)

    # persist brief
    db = SessionLocal()
    try:
        b = Brief(week_start=week_start_date, content_md=content)
        db.add(b)
        db.commit()
    finally:
        db.close()

    return content
