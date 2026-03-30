FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /app/requirements.txt

COPY backend/ /app/

# Create data directory for SQLite database
RUN mkdir -p /app/data /app/uploads

ENV DB_PATH="/app/data/rel_database.db"
ENV JWT_SECRET="change-me"
ENV CORS_ORIGINS="*"

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
