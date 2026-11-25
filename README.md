# Production-Grade Docker Compose Application

A containerized three-tier app: React frontend, Node.js/Express API, PostgreSQL, Redis, and an Nginx reverse proxy.

## Features
- Multi-stage Docker builds, non-root API container
- Two isolated networks (frontend-net, backend-net); the database and Redis are not exposed to the host
- Named volumes for PostgreSQL and Redis data
- Health checks on every service with `depends_on: service_healthy`
- Environment variables managed through `.env`
- Redis caching for the task list and a visit counter

## Run it
```bash
cp .env.example .env     # then edit the passwords
docker compose up -d --build
docker compose ps
```
Open http://localhost:9090 (set by `APP_PORT` in `.env`).

## Stop it
```bash
docker compose down        # keep data
docker compose down -v     # delete data too
```
