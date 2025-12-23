from fastapi import FastAPI
from celery import Celery
import os

app = FastAPI()

celery_app = Celery(
    "worker",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
)

@app.get("/")
def read_root():
    return {"message": "Hello from Semantic Opendata ETL Platform API"}

@app.post("/scan")
def trigger_scan(url: str):
    task = celery_app.send_task("app.tasks.scanning.scan_site", args=[url])
    return {"task_id": task.id, "status": "Processing"}
