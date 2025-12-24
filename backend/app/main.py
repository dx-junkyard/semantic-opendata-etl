from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from celery import Celery
from pydantic import BaseModel, HttpUrl
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    url: HttpUrl

celery_app = Celery(
    "worker",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
)

@app.get("/")
def read_root():
    return {"message": "Hello from Semantic Opendata ETL Platform API"}

@app.post("/scan")
def trigger_scan(request: ScanRequest):
    task = celery_app.send_task("app.tasks.scanning.scan_site", args=[str(request.url)])
    return {"task_id": task.id, "status": "Processing"}
