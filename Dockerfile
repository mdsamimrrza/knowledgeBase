# Step 1: Build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Run the Python server
FROM python:3.13-slim
WORKDIR /app

# Install system dependencies if needed (none for now)
# RUN apt-get update && apt-get install -y ...

# Copy requirements and install
COPY server_py/requirements.txt ./server_py/
RUN pip install --no-cache-dir -r server_py/requirements.txt

# Copy built frontend assets
COPY --from=frontend-builder /app/dist ./dist

# Copy backend source code
COPY server_py ./server_py
COPY shared ./shared
COPY .env.example .env

# Expose port
EXPOSE 5000

# Run the application
CMD ["uvicorn", "server_py.main:app", "--host", "0.0.0.0", "--port", "5000"]
