# Semantic OpenData ETL

This project is a semantic data extraction, transformation, and loading (ETL) system. It features a Next.js frontend, a FastAPI backend, and a robust infrastructure including Neo4j, Qdrant, MongoDB, and Redis.

## Prerequisites

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Usage

### Build and Start

To build and start the entire system, run:

```bash
docker-compose up --build
```

### Accessing Services

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Neo4j Browser**: [http://localhost:7474](http://localhost:7474) (Auth: neo4j/password)

## System Configuration

The system consists of the following services:

### Services

| Service | Type | Port | Description |
| :--- | :--- | :--- | :--- |
| **frontend** | Next.js | 3000 | User interface for interacting with the system. |
| **backend** | FastAPI | 8000 | REST API for processing requests and managing data. |
| **worker** | Celery | N/A | Background worker for asynchronous task processing. |

### Infrastructure

| Service | Type | Port | Description |
| :--- | :--- | :--- | :--- |
| **redis** | Redis | 6379 | Message broker for Celery and caching layer. |
| **neo4j** | Neo4j | 7474, 7687 | Graph database for semantic relationship storage. |
| **qdrant** | Qdrant | 6333 | Vector database for similarity search and embeddings. |
| **mongodb** | MongoDB | 27017 | Document database for storing unstructured data. |

## Development

The project is organized into the following directories:

- `frontend/`: Next.js application source code.
- `backend/`: FastAPI application source code.
- `worker/`: Celery worker application source code.
- `common/`: Shared code and utilities.
