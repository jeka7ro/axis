# ==============================================================================
# Axis AI Platform - Production Backend Dockerfile (IOSS VPS Hardened)
# ==============================================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final Runtime Stage
FROM python:3.11-slim AS runner

WORKDIR /app

# Install runtime dependencies and security utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user for cybersecurity hardening (Principle of Least Privilege)
RUN groupadd -g 1001 axisgroup && \
    useradd -u 1001 -g axisgroup -m -s /bin/bash axisuser

# Copy installed python packages from builder
COPY --from=builder /root/.local /home/axisuser/.local
ENV PATH=/home/axisuser/.local/bin:$PATH

# Copy application source code and templates
COPY --chown=axisuser:axisgroup app/ ./app/
COPY --chown=axisuser:axisgroup templates/ ./templates/

# Ensure documents folder exists and is writable by axisuser
RUN mkdir -p /app/documents && chown -R axisuser:axisgroup /app

USER axisuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers", "--forwarded-allow-ips", "*"]
