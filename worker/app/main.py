from celery import Celery
import os
import time

celery_app = Celery(
    "worker",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
)

celery_app.conf.update(
    task_routes={
        'app.tasks.scanning.*': {'queue': 'scanning'},
        'app.tasks.transform.*': {'queue': 'transform'},
    },
    imports=['app.tasks.scanning']
)
