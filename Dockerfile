FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for building Python packages and running the app
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ .
# Also copy the frontend directory since the backend serves static files from it
COPY frontend/ /frontend/

# Expose the standard port
EXPOSE 8000

# Run the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
