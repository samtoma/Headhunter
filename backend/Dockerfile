FROM python:3.13-slim-bookworm

WORKDIR /app

# 2. Install System Deps (Minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpoppler-cpp-dev libglib2.0-0 libpq-dev postgresql-client && \
    rm -rf /var/lib/apt/lists/*



# 4. Python Requirements
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 30001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "30001"]