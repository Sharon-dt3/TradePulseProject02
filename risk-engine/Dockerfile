# Run the risk engine with a non-root user and one process per ECS task.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN useradd --system --create-home --uid 10001 tradepulse
WORKDIR /app

COPY requirements.txt .
RUN pip install --requirement requirements.txt
COPY app ./app

USER tradepulse
EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
