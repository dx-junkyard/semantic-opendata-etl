from app.main import celery_app
from common.core.htag_node import HTagNode
import time

@celery_app.task
def scan_site(url):
    print(f"Scanning site: {url}")
    # TODO: Implement actual scanning using HTagNode
    # This is a placeholder
    time.sleep(5)
    return {"status": "completed", "url": url, "nodes": 10}
