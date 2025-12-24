FROM python:3.9-slim

WORKDIR /app

# Install common package
COPY common /common
RUN pip install /common

COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY worker/app /app/app

# Run celery worker
ENV PYTHONPATH=/
CMD ["celery", "-A", "app.main.celery_app", "worker", "--loglevel=info"]
