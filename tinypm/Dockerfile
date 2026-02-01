# TinyPM Production Dockerfile
# Multi-stage build for smaller image size
#
# Build: docker build -t tinypm .
# Run:   docker run -p 8000:8000 --env-file .env tinypm
#
# Created: 2026-01-30

# ============================================
# BUILD STAGE
# ============================================
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip wheel && \
    pip install --no-cache-dir -r requirements.txt

# ============================================
# PRODUCTION STAGE
# ============================================
FROM python:3.11-slim

# Labels
LABEL maintainer="TinyPM Team"
LABEL description="TinyPM - AI-Powered Project Manager"
LABEL version="1.0.0"

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash --uid 1000 appuser && \
    chown -R appuser:appuser /app

# Create necessary directories with correct permissions
RUN mkdir -p uploads personas && \
    chown -R appuser:appuser uploads personas

# Switch to non-root user
USER appuser

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV TINYPM_DEBUG=false

# Port is set by Railway/platform via PORT env var
# Default to 8000 for local Docker runs
ENV PORT=8000

# Expose port (Railway ignores this, uses PORT)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen(f'http://localhost:{__import__(\"os\").environ.get(\"PORT\", 8000)}/api/health')" || exit 1

# Run the application
# web_server.py reads PORT from environment automatically
CMD ["python", "web_server.py"]
