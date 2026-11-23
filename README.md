# Cloud-Based File Optimization & PDF Platform (ConvPDF)

[![Docker](https://img.shields.io/badge/Docker-Multi--stage%20Builds-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-EKS%20%7C%20HPA%20%7C%20ALB-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Helm](https://img.shields.io/badge/Helm-v3%20Charts-0F1689?logo=helm&logoColor=white)](https://helm.sh/)
[![Terraform](https://img.shields.io/badge/Terraform-IaC%20AWS-7B42BC?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![Ansible](https://img.shields.io/badge/Ansible-Automation%20%26%20Hardening-EE0000?logo=ansible&logoColor=white)](https://www.ansible.com/)
[![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD%20Pipeline-D24939?logo=jenkins&logoColor=white)](https://www.jenkins.io/)
[![AWS](https://img.shields.io/badge/AWS-VPC%20%7C%20EKS%20%7C%20S3%20%7C%20ECR-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)

> **A high-performance, cloud-native PDF and document utility platform engineered with microservices architecture, automated Infrastructure as Code (IaC), multi-stage containerization, configuration management, and enterprise CI/CD pipelines.**

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [System Architecture](#-system-architecture)
- [DevOps & Cloud Engineering Stack](#-devops--cloud-engineering-stack)
  - [1. Containerization & Orchestration (Docker & Kubernetes)](#1-containerization--orchestration)
  - [2. Infrastructure as Code (Terraform)](#2-infrastructure-as-code-terraform)
  - [3. Configuration Management (Ansible)](#3-configuration-management-ansible)
  - [4. CI/CD Automation (Jenkins Pipeline)](#4-cicd-automation-jenkins)
  - [5. AWS Operational Automation (Boto3 & CloudFormation)](#5-aws-operational-automation)
- [Project Directory Layout](#-project-directory-layout)
- [Quick Start & Local Setup](#-quick-start--local-setup)
- [DevOps Execution Commands](#-devops-execution-commands)
- [Security, FinOps & Observability](#-security-finops--observability)
- [Interview Guide & Deep Dive](#-interview-guide--deep-dive)

---

## 🌟 Project Overview

**ConvPDF** is an asynchronous document processing web platform designed for client- and server-assisted PDF operations, such as merging, splitting, converting, optimizing, compressing, and protecting PDF files.

Beyond frontend and API capabilities, the project serves as an end-to-end showcase of modern **Cloud and DevOps Engineering** best practices:
- **Scalable Microservices**: Decoupled frontend, API server, and heavy asynchronous PDF workers connected via Redis message queues.
- **Enterprise IaC**: Modular Terraform configurations provisioning VPCs, subnets, S3 buckets, ECR registries, and Amazon EKS.
- **Zero-Downtime Deployment**: Kubernetes rolling deployments with health probes, Horizontal Pod Autoscalers (HPA), and AWS ALB Ingress.
- **Automated Configuration**: Ansible playbooks for Linux server hardening, Docker provisioning, and application deployments.
- **Robust CI/CD Pipeline**: Declarative Jenkins pipeline incorporating linting, SonarQube code quality gates, Trivy container security scanning, AWS ECR pushes, and Helm releases.
- **FinOps & Cloud Automation**: Python Boto3 automation for S3 storage lifecycle cleanup, EC2 non-production auto-scheduling, and CloudWatch metric alarming.

---

## 🏛️ System Architecture

```
                                [ End Users / Clients ]
                                           │
                                           ▼
                            [ AWS Route 53 & CloudFront CDN ]
                                           │
                                           ▼
                         [ AWS Application Load Balancer (ALB) ]
                                /                      \
                    Path: /    /                        \   Path: /api/*
                              ▼                          ▼
               ┌────────────────────────┐      ┌────────────────────────┐
               │ React Frontend Pods    │      │ Node.js Express API    │
               │ (Nginx Multi-stage)    │      │ (Horizontal Autoscaler)│
               └────────────────────────┘      └───────────┬────────────┘
                                                           │
                                        ┌──────────────────┴──────────────────┐
                                        ▼                                     ▼
                             ┌─────────────────────┐              ┌──────────────────────┐
                             │  Redis 7 Job Queue  │              │ Amazon S3 Storage    │
                             └──────────┬──────────┘              │ (Temp & Archive)     │
                                        │                         └──────────────────────┘
                                        ▼                                     ▲
                             ┌─────────────────────┐                          │
                             │ PDF Worker Pods     │──────────────────────────┘
                             │ (Ghostscript / OCR) │ (Stores optimized files)
                             └─────────────────────┘
```

---

## 🛠️ DevOps & Cloud Engineering Stack

### 1. Containerization & Orchestration
- **Multi-Stage Frontend Build (`Dockerfile.client`)**: Uses Node.js 20-Alpine to compile React/Vite assets and drops them into a hardened Nginx Alpine image, reducing final image footprint to **< 25MB**.
- **Hardened API Server (`Dockerfile.server`)**: Node.js 20 Bullseye-slim base configured with non-root user permissions, Ghostscript, Poppler utilities, and `/api/health` probes.
- **Dedicated Workers (`Dockerfile.worker`)**: Independent container for background conversions and compression.
- **Docker Compose (`docker-compose.yml`)**: Local multi-container orchestration with frontend, backend, worker, Redis, and MinIO (local S3 mock).
- **Kubernetes Manifests (`k8s/`)**: Production-ready definitions:
  - `namespace.yaml`, `configmap.yaml`, `secrets.yaml`
  - `backend-deployment.yaml`, `frontend-deployment.yaml`, `worker-and-redis.yaml`
  - `ingress.yaml` (AWS ALB Ingress Controller with SSL termination)
  - `hpa.yaml` (Horizontal Pod Autoscaler scaling on CPU > 70% and Memory > 80%)
  - `kustomization.yaml` for streamlined declarative deployment
- **Helm Chart (`helm/convpdf/`)**: Full Helm chart with `values.yaml` enabling multi-environment templating (dev, staging, production).

### 2. Infrastructure as Code (Terraform)
Located in `terraform/`, organized using reusable, tested modules with AWS provider `~> 5.0` and remote S3 backend state locking with DynamoDB:
- **`modules/vpc`**: Multi-AZ VPC architecture with public/private subnets, NAT Gateway, and Internet Gateway.
- **`modules/s3`**: Document storage buckets configured with AES256 server-side encryption, public access block, and automated lifecycle rules (expiring temporary files after 24h and archiving to Glacier after 30 days).
- **`modules/ecr`**: Private container registries for all images with scan-on-push and retention policies.
- **`modules/eks`**: Amazon EKS control plane and managed EC2 worker node groups with IAM Roles for Service Accounts (IRSA).
- **`modules/security`**: Security groups strictly segregating internet-facing ALB traffic from internal worker nodes.

### 3. Configuration Management (Ansible)
Located in `ansible/` with production inventory and role-based structure:
- **`ansible.cfg` & `inventory/production.ini`**: Environment setup with SSH connection pipelining and host groupings.
- **`playbooks/site.yml`**: Master orchestrator executing server preparation and application deployments.
- **`playbooks/security-hardening.yml`**: Host baseline security (UFW firewall rules, `fail2ban` intrusion prevention, and SSH password authentication lockdown).
- **`roles/docker`**: Automated installation and configuration of Docker CE, containerd, and Docker Compose plugin.
- **`roles/convpdf-app`**: Manages ECR authentication, pulls production tags, writes `.env` templates, and performs zero-downtime service restarts.

### 4. CI/CD Automation (Jenkins)
Enterprise Declarative Pipeline defined in [Jenkinsfile](Jenkinsfile) featuring 12 automated stages:
1. **Checkout & Environment Validation**: Logs commit, branch, and runtime versions.
2. **Lint & Dependency Audit**: Runs ESLint and NPM vulnerability audits.
3. **SAST Code Quality**: SonarQube static code analysis with quality gate threshold.
4. **Parallel Docker Image Build**: Multi-threaded image builds tagged with `${BUILD_NUMBER}-${GIT_COMMIT}`.
5. **Container Security Scan (Trivy)**: Scans images for `HIGH` and `CRITICAL` CVEs before pushing.
6. **Push to Amazon ECR**: Automated login and push of immutable tags and `latest`.
7. **Terraform Validation**: Validates IaC configurations before release.
8. **Staging Helm Deployment**: Deploys release to `convpdf-staging` Kubernetes namespace.
9. **Automated Smoke Testing**: HTTP health checks against `/api/health`.
10. **Manual Approval Gate**: 24-hour timeout prompt for authorized production rollouts.
11. **Production Deployment**: Rolling Helm upgrade into `convpdf` production cluster.
12. **Post-Build Actions**: Workspace cleanup and Slack notifications for build status.

### 5. AWS Operational Automation
Located in `aws-automation/`:
- **`lambda/s3_pdf_optimizer_trigger.py`**: Serverless Python Lambda function triggered on S3 `ObjectCreated` events to record job status in DynamoDB and queue tasks.
- **`scripts/s3_cleanup_temp_files.py`**: Boto3 script purging temporary and processed PDF files older than 24 hours to reduce cloud storage bills.
- **`scripts/ec2_cost_optimizer.py`**: Boto3 FinOps scheduler that stops staging EC2 instances after business hours and starts them at morning.
- **`scripts/cloudwatch_metric_alarms.py`**: Programmatically provisions CloudWatch alarms for ALB 5XX error spikes (>10/min) and EKS worker node CPU utilization (>80%).
- **`cloudformation/pdf-processing-pipeline.yaml`**: CloudFormation template provisioning S3 $\rightarrow$ SQS $\rightarrow$ Lambda $\rightarrow$ DynamoDB event processing pipeline.

---

## 📂 Project Directory Layout

```
.
├── Dockerfile.client               # Multi-stage React + Nginx Docker build
├── Dockerfile.server               # Hardened Node.js API container
├── Dockerfile.worker               # Asynchronous PDF processing worker
├── docker-compose.yml              # Local multi-service orchestration
├── nginx.conf                      # Nginx SPA & reverse proxy configuration
├── Jenkinsfile                     # 12-stage declarative enterprise CI/CD pipeline
├── DEVOPS.md                       # Comprehensive DevOps Architecture & Interview Guide
│
├── k8s/                            # Kubernetes Manifests (Kustomize)
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── frontend-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── worker-and-redis.yaml
│   ├── ingress.yaml                # AWS ALB Ingress controller
│   ├── hpa.yaml                    # Horizontal Pod Autoscaler
│   └── kustomization.yaml
│
├── helm/                           # Kubernetes Helm Chart
│   └── convpdf/
│       ├── Chart.yaml
│       └── values.yaml
│
├── terraform/                      # Modular Terraform Infrastructure as Code
│   ├── main.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── terraform.tfvars.example
│   └── modules/
│       ├── vpc/                    # Multi-AZ VPC, subnets, NAT, IGW
│       ├── s3/                     # Encrypted buckets & lifecycle rules
│       ├── ecr/                    # Container registries & retention
│       ├── eks/                    # Managed EKS cluster & node groups
│       └── security/               # ALB and node security groups
│
├── ansible/                        # Configuration Management & Playbooks
│   ├── ansible.cfg
│   ├── inventory/
│   │   └── production.ini
│   ├── playbooks/
│   │   ├── site.yml                # Main provisioning & deploy playbook
│   │   └── security-hardening.yml  # UFW, fail2ban, SSH hardening
│   └── roles/
│       ├── docker/                 # Automated Docker CE installation
│       └── convpdf-app/            # App rollout, ECR pull, systemd/compose
│
├── aws-automation/                 # Python Boto3 & CloudFormation Automation
│   ├── lambda/
│   │   └── s3_pdf_optimizer_trigger.py # Event-driven S3 processing trigger
│   ├── scripts/
│   │   ├── s3_cleanup_temp_files.py    # S3 lifecycle cleanup automation
│   │   ├── ec2_cost_optimizer.py       # FinOps EC2 auto-scheduler
│   │   └── cloudwatch_metric_alarms.py # Programmatic CloudWatch alarms
│   └── cloudformation/
│       └── pdf-processing-pipeline.yaml# CloudFormation event pipeline stack
│
├── server/                         # Express API & PDF Processing Backend
│   └── index.js
├── src/                            # React 19 + Tailwind CSS Frontend
└── public/                         # Static Web Assets
```

---

## ⚡ Quick Start & Local Setup

### Option A: Local Containerized Run (Recommended)

Run the complete multi-service stack with a single command:

```bash
docker compose up --build -d
```

Verify service status:
```bash
docker compose ps
curl http://localhost/health
curl http://localhost:5000/api/health
```

Stop containers:
```bash
docker compose down
```

### Option B: Bare-Metal Node.js Development

```bash
# Install dependencies
npm install

# Run frontend + backend concurrently
npm run dev:full

# Or run separately
npm run dev:client    # Vite frontend (http://localhost:5173)
npm run dev:server    # Express API (http://localhost:5000)
```

---

## 💻 DevOps Execution Commands

### Kubernetes (K8s & Helm)
```bash
# Deploy with Kustomize
kubectl apply -k k8s/

# Check status of pods, services, and HPA
kubectl get pods,svc,hpa -n convpdf

# Deploy or Upgrade using Helm
helm upgrade --install convpdf ./helm/convpdf \
  --namespace convpdf \
  --create-namespace \
  --set global.environment=production
```

### Terraform (Infrastructure as Code)
```bash
cd terraform
terraform init
terraform validate
terraform plan -var-file="terraform.tfvars.example" -out=tfplan.binary
terraform apply tfplan.binary
```

### Ansible (Server Provisioning & Hardening)
```bash
cd ansible

# Run OS hardening (UFW firewall, SSH protection, fail2ban)
ansible-playbook -i inventory/production.ini playbooks/security-hardening.yml

# Provision Docker & deploy application
ansible-playbook -i inventory/production.ini playbooks/site.yml
```

### AWS Automation (Python Boto3)
```bash
# Run S3 temp file cleanup script (dry-run or execution)
python aws-automation/scripts/s3_cleanup_temp_files.py

# Check status or stop non-production EC2 instances (FinOps)
python aws-automation/scripts/ec2_cost_optimizer.py status
python aws-automation/scripts/ec2_cost_optimizer.py stop

# Provision CloudWatch alarms for ALB and EKS
python aws-automation/scripts/cloudwatch_metric_alarms.py
```

---

## 🛡️ Security, FinOps & Observability

- **Non-Root Containers**: Container images execute under unprivileged user contexts (`USER node` / `nginx`).
- **Network Segmentation**: Internal workers and databases reside within private subnets with no direct public IPs.
- **Container Vulnerability Scanning**: Integrated Trivy and ECR vulnerability scanning with zero toleration for unmitigated critical CVEs.
- **FinOps Cloud Cost Optimization**:
  - S3 automated lifecycle rules purges temporary processing files older than 24 hours.
  - S3 Glacier automatic transitioning for archived documents after 30 days.
  - Scheduled shutdown of non-production EC2 nodes after business hours.
- **Reliability & Self-Healing**: Kubernetes liveness and readiness probes automatically restart unhealthy containers, and HPA dynamically handles traffic spikes.

---

## 📚 Interview Guide & Deep Dive

For an in-depth breakdown of the architecture, talking points, and answers to common DevOps interview questions (e.g., handling secrets, rolling deployment strategies, Helm templating, and cloud cost optimization), refer to:

👉 **[DEVOPS.md](DEVOPS.md)** — *Full DevOps Engineering & Interview Preparation Guide*
