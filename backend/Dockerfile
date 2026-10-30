# SmartHire API — production image
# Build from the repository root:  docker build -f backend/Dockerfile -t smarthire-api .
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface \
    EMBEDDING_DEVICE=cpu

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements.txt
# CPU-only torch first: the default Linux wheel bundles CUDA and adds several GB.
RUN pip install --upgrade pip \
    && pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r backend/requirements.txt

# Bake the embedding model into the image so the first request isn't a cold download.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY backend/ backend/

# uid 1000 is also what Hugging Face Spaces runs containers as.
RUN useradd --create-home --uid 1000 smarthire \
    && mkdir -p /app/data \
    && chown -R smarthire:smarthire /app
USER smarthire

ENV DATABASE_URL=sqlite+aiosqlite:////app/data/smarthire.db
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
