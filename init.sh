#!/bin/bash
# NextUp - Development Environment Setup Script
# This script sets up and runs the development environment for NextUp

set -e

echo "============================================"
echo "NextUp - Development Environment Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_requirements() {
    echo "Checking requirements..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18+${NC}"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}Error: Node.js version 18+ required. Current: $(node -v)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm $(npm -v)${NC}"

    # Check for Docker (optional, for local PostgreSQL and Redis)
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker available${NC}"
        DOCKER_AVAILABLE=true
    else
        echo -e "${YELLOW}! Docker not found - you'll need to configure PostgreSQL and Redis manually${NC}"
        DOCKER_AVAILABLE=false
    fi

    echo ""
}

# Setup environment file
setup_env() {
    if [ ! -f .env ]; then
        echo "Creating .env file from template..."
        if [ -f .env.example ]; then
            cp .env.example .env
            echo -e "${YELLOW}! Please update .env with your actual credentials${NC}"
        else
            cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://nextup:nextup@localhost:5432/nextup?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-development-secret-change-in-production"

# Google OAuth (optional for development)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# IGDB API (Twitch)
TWITCH_CLIENT_ID=""
TWITCH_CLIENT_SECRET=""

# IsThereAnyDeal API
ITAD_API_KEY=""

# Redis (for caching and job queues)
REDIS_URL="redis://localhost:6379"

# SMTP (optional for development)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="noreply@nextup.local"
EOF
            echo -e "${GREEN}✓ Created .env file${NC}"
            echo -e "${YELLOW}! Please update .env with your credentials before running the app${NC}"
        fi
    else
        echo -e "${GREEN}✓ .env file exists${NC}"
    fi
    echo ""
}

# Start Docker services if available
start_docker_services() {
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo "Starting Docker services (PostgreSQL & Redis)..."

        # Check if docker-compose file exists
        if [ -f docker-compose.yml ]; then
            docker-compose up -d postgres redis
            echo -e "${GREEN}✓ Docker services started${NC}"
        else
            # Create minimal docker-compose for development
            cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: nextup-postgres
    environment:
      POSTGRES_USER: nextup
      POSTGRES_PASSWORD: nextup
      POSTGRES_DB: nextup
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: nextup-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF
            echo -e "${GREEN}✓ Created docker-compose.yml${NC}"
            docker-compose up -d postgres redis
            echo -e "${GREEN}✓ Docker services started${NC}"
        fi

        # Wait for PostgreSQL to be ready
        echo "Waiting for PostgreSQL to be ready..."
        sleep 3

    else
        echo -e "${YELLOW}Skipping Docker services - configure databases manually${NC}"
    fi
    echo ""
}

# Install dependencies
install_dependencies() {
    echo "Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

# Setup database
setup_database() {
    echo "Setting up database..."

    # Generate Prisma client
    npx prisma generate

    # Run migrations
    npx prisma migrate dev --name init 2>/dev/null || npx prisma db push

    echo -e "${GREEN}✓ Database setup complete${NC}"
    echo ""
}

# Start development server
start_dev_server() {
    echo "============================================"
    echo "Starting development server..."
    echo "============================================"
    echo ""
    echo -e "${GREEN}Application will be available at:${NC}"
    echo -e "  ${GREEN}→ http://localhost:3000${NC}"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""

    npm run dev
}

# Main execution
main() {
    check_requirements
    setup_env

    # Only start Docker services if requested
    if [ "$1" = "--with-docker" ] || [ "$1" = "-d" ]; then
        start_docker_services
    fi

    install_dependencies

    # Check if this is a fresh setup (no node_modules or prisma not generated)
    if [ -d "prisma" ]; then
        setup_database
    fi

    start_dev_server
}

# Show help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: ./init.sh [options]"
    echo ""
    echo "Options:"
    echo "  -d, --with-docker    Start PostgreSQL and Redis using Docker"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Environment Variables (configure in .env):"
    echo "  DATABASE_URL         PostgreSQL connection string"
    echo "  REDIS_URL            Redis connection string"
    echo "  NEXTAUTH_SECRET      Secret for NextAuth.js sessions"
    echo "  TWITCH_CLIENT_ID     IGDB API (Twitch) client ID"
    echo "  TWITCH_CLIENT_SECRET IGDB API (Twitch) client secret"
    echo "  ITAD_API_KEY         IsThereAnyDeal API key"
    echo ""
    exit 0
fi

main "$@"
