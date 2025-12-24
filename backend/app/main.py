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
    max_depth: int = 1

celery_app = Celery(
    "worker",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
)

# Neo4j configuration
from neo4j import GraphDatabase
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

@app.get("/")
def read_root():
    return {"message": "Hello from Semantic Opendata ETL Platform API"}

@app.get("/api/v1/tree")
def get_site_tree():
    try:
        with driver.session() as session:
            # Cypher query to get nodes and relationships with limit
            # Note: Limiting nodes might result in disconnected graph if relations are not carefully handled,
            # but for preventing crash, we just limit the start nodes.
            result = session.run("""
                MATCH (p:Page)
                WITH p LIMIT 100
                OPTIONAL MATCH (p)-[r:LINKS_TO]->(c:Page)
                WHERE c.level > p.level
                RETURN p.url as url, p.title as title, collect(c.url) as children
            """)
            
            nodes = []
            for record in result:
                url = record["url"]
                title = record["title"] or url
                children = record["children"]
                nodes.append({
                    "id": url,
                    "label": title,
                    "children": children
                })
            
            print(f"DEBUG: Returning {len(nodes)} nodes to frontend")
            return {"nodes": nodes}
    except Exception as e:
        print(f"Error fetching tree: {e}")
        return {"error": str(e)}

@app.post("/api/v1/reset")
def reset_db():
    try:
        with driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        print("Database reset successfully")
        return {"status": "Database reset"}
    except Exception as e:
         print(f"Error resetting database: {e}")
         return {"error": str(e)}

@app.post("/scan")
def trigger_scan(request: ScanRequest):
    task = celery_app.send_task("app.tasks.scanning.scan_site", args=[str(request.url), request.max_depth])
    return {"task_id": task.id, "status": "Processing"}
