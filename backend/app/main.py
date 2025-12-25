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
def get_site_tree(url: str = None):
    try:
        with driver.session() as session:
            # If no URL provided, get roots (nodes with no incoming LINKS_TO within the dataset, or just top nodes)
            # If no URL provided, get roots (nodes with no incoming LINKS_TO within the dataset, or just top nodes)
            # Returning all distinct roots (no incoming links) as "Recent Investigations"
            # If no URL provided, get roots (nodes with no incoming LINKS_TO within the dataset, or just top nodes)
            # Returning all distinct roots (no incoming links) as "Recent Investigations"
            if not url:
                result = session.run("""
                    MATCH (n:Page)
                    WHERE n.level = 0
                    RETURN n.url as url, n.title as title
                    ORDER BY n.last_scanned_at DESC
                    LIMIT 50
                """)
                nodes = [{"id": record["url"], "label": record["title"] or record["url"], "type": "root"} for record in result]
                return {"nodes": nodes, "parent": None, "current": None}

            # If URL is provided, get specific node, its children, and its parent(s)
            result = session.run("""
                MATCH (current:Page {url: $url})
                OPTIONAL MATCH (current)-[:LINKS_TO]->(child:Page)
                OPTIONAL MATCH (parent:Page)-[:LINKS_TO]->(current)
                RETURN 
                    current.url as current_url, 
                    current.title as current_title,
                    current.content as current_content,
                    collect(DISTINCT {id: child.url, label: child.title}) as children,
                    collect(DISTINCT {id: parent.url, label: parent.title}) as parents
            """, url=url)
            
            data = result.single()
            if not data:
                return {"error": "Node not found"}

            current_node = {
                "id": data["current_url"], 
                "label": data["current_title"] or data["current_url"],
                "content": data["current_content"]
            }
            
            # Clean up children/parents (remove nulls if any)
            children = [c for c in data["children"] if c["id"]]
            parents = [p for p in data["parents"] if p["id"]]
            
            return {
                "current": current_node,
                "children": children,
                "parents": parents
            }
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
