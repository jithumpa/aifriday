import pandas as pd
from io import StringIO
from db import SessionLocal
from models import Metric, Initiative, Note
import datetime


def ingest_metrics_csv(upload_file, source_label):
    # upload_file is fastapi UploadFile or similar with file-like .file
    if hasattr(upload_file, 'file'):
        df = pd.read_csv(upload_file.file)
    else:
        df = pd.read_csv(StringIO(upload_file.read().decode()))
    required = ['date','org_unit','metric_name','value','unit']
    if not all(c in df.columns for c in required):
        raise Exception('Missing required columns in metrics CSV')
    db = SessionLocal()
    count = 0
    try:
        for idx, row in df.iterrows():
            m = Metric(
                source=source_label,
                date=pd.to_datetime(row['date']).date(),
                org_unit=str(row['org_unit']),
                metric_name=str(row['metric_name']),
                value=float(row['value']),
                unit=str(row['unit']),
                raw_row=str(row.to_dict())
            )
            db.add(m)
            count += 1
        db.commit()
        return count
    finally:
        db.close()


def ingest_initiatives_csv(upload_file):
    if hasattr(upload_file, 'file'):
        df = pd.read_csv(upload_file.file)
    else:
        df = pd.read_csv(StringIO(upload_file.read().decode()))
    required = ['id','name','owner','pillar','status','due_date','last_update']
    if not all(c in df.columns for c in required):
        raise Exception('Missing required columns in initiatives CSV')
    db = SessionLocal()
    count = 0
    try:
        for idx, row in df.iterrows():
            ni = Initiative(
                id=str(row['id']),
                name=str(row['name']),
                owner=str(row['owner']),
                pillar=str(row['pillar']),
                status=str(row['status']),
                due_date=pd.to_datetime(row['due_date']).date() if pd.notna(row['due_date']) else None,
                last_update=pd.to_datetime(row['last_update']) if pd.notna(row['last_update']) else None,
                raw_row=str(row.to_dict())
            )
            db.merge(ni)
            count += 1
        db.commit()
        return count
    finally:
        db.close()


def ingest_notes(text, source='meeting_notes.txt'):
    db = SessionLocal()
    try:
        n = Note(source=source, content=text)
        db.add(n)
        db.commit()
        return n.id
    finally:
        db.close()
