# Dedicated image for the external market-feed producer.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN useradd --system --create-home --uid 10001 tradepulse
WORKDIR /app

COPY requirements.txt .
RUN pip install --requirement requirements.txt
COPY . .

USER tradepulse
CMD ["python", "free_tier_producer.py"]
