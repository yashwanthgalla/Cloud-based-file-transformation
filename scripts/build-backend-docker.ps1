<#
.SYNOPSIS
    PowerShell Docker Build Script for Backend Microservice
.EXAMPLE
    .\scripts\build-backend-docker.ps1 -Tag "1.0.0"
#>
param(
    [string]$Tag = "latest",
    [string]$AwsAccountId = "123456789012",
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Stop"
$AppName = "convpdf-backend"
$EcrRegistry = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🔨 Building Docker image: $AppName:$Tag" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Compile backend assets
Write-Host "📦 Compiling backend artifacts..." -ForegroundColor Yellow
node scripts/build-backend.mjs

# 2. Build Docker container
Write-Host "🐳 Building Docker container image..." -ForegroundColor Yellow
$env:DOCKER_BUILDKIT = "1"
docker build `
    --file Dockerfile.server `
    --tag "$AppName:$Tag" `
    --tag "$AppName:latest" `
    --tag "$EcrRegistry/$AppName:$Tag" `
    --tag "$EcrRegistry/$AppName:latest" `
    --build-arg NODE_ENV=production `
    .

Write-Host "✅ Backend Docker container built successfully!" -ForegroundColor Green
