#!/bin/bash

# ============================================================================
# NextUp - Docker Setup Script
# ============================================================================
# This script helps you get started with Docker development
# ============================================================================

set -e

echo "============================================"
echo "NextUp - Docker Setup"
echo "============================================"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✓ Docker is available"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available"
    exit 1
fi

echo "✓ Docker Compose is available"
echo ""

# Start services based on mode
MODE=${1:-dev}

case $MODE in
    dev)
        echo "Starting development services (PostgreSQL + Redis)..."
        docker compose up -d postgres redis

        echo ""
        echo "Waiting for services to be healthy..."
        sleep 5

        echo ""
        echo "============================================"
        echo "Development services are running!"
        echo "============================================"
        echo ""
        echo "PostgreSQL: localhost:5432"
        echo "  - User: nextup"
        echo "  - Password: nextup_dev_password"
        echo "  - Database: nextup"
        echo ""
        echo "Redis: localhost:6379"
        echo ""
        echo "Next steps:"
        echo "  1. Copy .env.docker to .env"
        echo "  2. Copy prisma/schema.postgresql.prisma to prisma/schema.prisma"
        echo "  3. Run: npx prisma migrate dev"
        echo "  4. Run: npm run dev"
        ;;

    full)
        echo "Building and starting full stack..."
        docker compose --profile full up -d --build

        echo ""
        echo "Waiting for services to be healthy..."
        sleep 10

        echo ""
        echo "============================================"
        echo "Full stack is running!"
        echo "============================================"
        echo ""
        echo "Application: http://localhost:3000"
        echo "PostgreSQL: localhost:5432"
        echo "Redis: localhost:6379"
        ;;

    stop)
        echo "Stopping all services..."
        docker compose --profile full down
        echo "✓ All services stopped"
        ;;

    clean)
        echo "Stopping services and removing volumes..."
        docker compose --profile full down -v
        echo "✓ Services stopped and volumes removed"
        ;;

    *)
        echo "Usage: ./docker-setup.sh [dev|full|stop|clean]"
        echo ""
        echo "  dev   - Start PostgreSQL and Redis for local development (default)"
        echo "  full  - Build and start the full stack including the Next.js app"
        echo "  stop  - Stop all running services"
        echo "  clean - Stop services and remove all data volumes"
        ;;
esac
