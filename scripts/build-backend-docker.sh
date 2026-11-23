#!/usr/bin/env bash
# ============================================================
# Docker Build Script for Backend Microservice
# Usage: ./scripts/build-backend-docker.sh [TAG]
# ============================================================

set -e

APP_NAME="convpdf-backend"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-123456789012}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
VERSION_TAG="${1:-latest}"

echo "=================================================="
echo "🔨 Building Docker image: ${APP_NAME}:${VERSION_TAG}"
echo "=================================================="

# 1. Trigger backend artifact compilation
echo "📦 Running backend pre-build step..."
node scripts/build-backend.mjs

# 2. Build the Docker container using Dockerfile.server
echo "🐳 Executing Docker build with BuildKit..."
DOCKER_BUILDKIT=1 docker build \
  --file Dockerfile.server \
  --tag "${APP_NAME}:${VERSION_TAG}" \
  --tag "${APP_NAME}:latest" \
  --tag "${ECR_REGISTRY}/${APP_NAME}:${VERSION_TAG}" \
  --tag "${ECR_REGISTRY}/${APP_NAME}:latest" \
  --build-arg NODE_ENV=production \
  --label "org.opencontainers.image.title=ConvPDF Backend" \
  --label "org.opencontainers.image.version=${VERSION_TAG}" \
  --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  .

echo "✅ Docker build completed successfully!"
echo "To push to ECR run:"
echo "  aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
echo "  docker push ${ECR_REGISTRY}/${APP_NAME}:${VERSION_TAG}"
