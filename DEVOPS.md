# Cloud-Based File Transformation & PDF Platform - DevOps Engineering Guide & Interview Preparation

This document outlines the end-to-end DevOps, Cloud Architecture, Infrastructure as Code, Containerization, Configuration Management, and CI/CD pipelines implemented for **CloudBasedFileTransformation** (ConvPDF).

---

## 🏗️ 1. Architecture Overview

The platform uses a modern cloud-native, microservices-oriented architecture:

```
                  [ AWS Route 53 / DNS ]
                             │
                             ▼
              [ AWS CloudFront CDN / ACM SSL ]
                             │
                             ▼
              [ Application Load Balancer (ALB) ]
               /                             \
              / (HTTP 80 / static)            \ (/api/ prefix)
             ▼                                 ▼
   [ React Frontend Pods ]           [ Node.js API Pods ]
   (Nginx Multi-stage build)         (HorizontalPodAutoscaler)
                                       │        │
                                       │        ▼
                                       │   [ Redis 7 Queue ]
                                       │        ▲
                                       │        │
                                       ▼        ▼
                                 [ PDF Processing Workers ]
                                 (Ghostscript, Tesseract OCR)
                                       │
                                       ▼
                       [ Amazon S3 Object Storage ]
                       (Auto-lifecycle temp cleanup)
```

---

## 📁 2. Repository DevOps Assets

| Tool | Path / Location | Purpose |
|---|---|---|
| **Docker** | `Dockerfile.client`, `Dockerfile.server`, `Dockerfile.worker`, `docker-compose.yml`, `nginx.conf`, `.dockerignore` | Multi-stage image builds, local orchestration, non-root secure containers |
| **Backend Build** | `scripts/build-backend.mjs`, `server/dist/index.cjs`, `server/dist/build-manifest.json` | Standalone backend compilation, build manifests, release artifacts |
| **Kubernetes** | `k8s/` (`namespace`, `configmap`, `secrets`, `deployments`, `ingress`, `hpa`, `kustomization.yaml`) | Production container orchestration, auto-scaling, ALB ingress, rolling updates |
| **Helm** | `helm/convpdf/` (`Chart.yaml`, `values.yaml`) | Parameterized Kubernetes deployments across dev, staging, and production |
| **Terraform** | `terraform/` (`main.tf`, `providers.tf`, `variables.tf`, `modules/vpc`, `modules/s3`, `modules/ecr`, `modules/eks`, `modules/security`) | Modular Infrastructure as Code (IaC) for AWS VPC, S3, ECR, and EKS |
| **Ansible** | `ansible/` (`ansible.cfg`, `inventory/`, `playbooks/site.yml`, `roles/docker`, `roles/convpdf-app`) | Server provisioning, Docker engine installation, system security hardening |
| **Jenkins** | `Jenkinsfile` | Declarative 12-stage CI/CD pipeline with SonarQube, Trivy scanning, ECR push, and Helm deployment |
| **AWS Automation** | `aws-automation/` (`lambda/`, `scripts/`, `cloudformation/`) | Boto3 scripts for S3 lifecycle cleanup, EC2 FinOps auto-scheduler, CloudWatch alarms, and CloudFormation |

---

## 🎯 3. Interview Cheat Sheet & Question-Answer Guide

Use these talking points during your technical interviews to explain your hands-on contributions:

### Q1: "Can you explain how you containerized this application?"
> **Answer**:
> "I designed a multi-container architecture using Docker:
> 1. **Frontend**: I implemented a multi-stage Dockerfile (`Dockerfile.client`). The first stage uses Node.js 20-Alpine to compile the React/Vite assets, and the second stage copies the production build into an unprivileged Nginx image. This reduced image size from ~800MB to under 25MB and improved security.
> 2. **Backend**: Built on Node.js Bullseye-slim with native libraries (`ghostscript`, `poppler-utils`) required for PDF rendering. Configured non-root `node` user execution and health probes on `/api/health`.
> 3. **Worker**: A dedicated background consumer image designed to process memory-intensive PDF compression and OCR tasks asynchronously.
> 4. **Docker Compose**: Orchestrates frontend, backend, worker, and Redis queue for local staging."

---

### Q2: "How is Kubernetes configured for high availability and zero downtime?"
> **Answer**:
> "We deployed the microservices to Amazon EKS using Kubernetes manifests organized with Kustomize and packaged as a Helm chart:
> - **Rolling Updates**: Configured `maxSurge: 1` and `maxUnavailable: 0` so new pods are fully ready before old pods terminate.
> - **Probes**: Implemented `livenessProbe` and `readinessProbe` hitting `/api/health` and `/health` to ensure traffic is only routed to healthy pods.
> - **Horizontal Pod Autoscaling (HPA)**: Scaled backend and worker pods dynamically based on CPU (>70%) and Memory (>80%) utilization (from 2 up to 10 replicas).
> - **Ingress**: Used AWS Load Balancer Controller (`alb.ingress.kubernetes.io`) with SSL termination via ACM and path routing (`/api` to backend, `/` to frontend)."

---

### Q3: "What does your Terraform Infrastructure as Code structure look like?"
> **Answer**:
> "I built modular Terraform (v1.5+) targeting AWS with remote S3 backend state locking via DynamoDB:
> - `modules/vpc`: Creates a custom VPC with public and private subnets across multiple AZs, Internet Gateway, and NAT Gateway for egress traffic.
> - `modules/s3`: Provisions encrypted buckets for uploaded documents with lifecycle policies that automatically expire temporary files after 24 hours and transition archives to S3 Glacier after 30 days.
> - `modules/ecr`: Manages container repositories for frontend, backend, and worker with automated image scanning and lifecycle policies keeping the last 15 tagged images.
> - `modules/eks`: Provisions the managed EKS control plane and worker node groups with IAM Roles for Service Accounts (IRSA)."

---

### Q4: "How did you implement CI/CD with Jenkins?"
> **Answer**:
> "I authored an end-to-end Declarative Jenkinsfile with 12 distinct stages:
> 1. **Code Validation**: Linting with ESLint and dependency scanning.
> 2. **SAST & Code Quality**: SonarQube scanning and NPM security audit.
> 3. **Container Build & Security**: Parallel Docker builds tagged with `${BUILD_NUMBER}-${GIT_COMMIT}`, followed by **Trivy** vulnerability scanning.
> 4. **Registry Push**: Authenticates with AWS ECR and pushes versioned and `latest` tags.
> 5. **IaC Validation**: `terraform validate` to ensure infrastructure code hygiene.
> 6. **Automated Staging Deployment**: Uses Helm to deploy into `convpdf-staging` namespace.
> 7. **Smoke Tests**: Verifies HTTP 200 response from health endpoints.
> 8. **Production Gate**: A manual 24-hour approval prompt before executing Helm rolling deployment to the production cluster."

---

### Q5: "What AWS Automation and Python Boto3 scripts have you built?"
> **Answer**:
> "I automated operational maintenance and cost optimization using Python Boto3:
> 1. **S3 Cleanup Automation** (`s3_cleanup_temp_files.py`): Scans `temp/` and `uploads/` prefixes and purges expired files older than 24 hours, saving AWS S3 storage costs.
> 2. **EC2 Cost Optimizer / FinOps Scheduler** (`ec2_cost_optimizer.py`): Automatically shuts down non-production staging EC2 instances outside working hours, reducing monthly compute costs by ~40%.
> 3. **CloudWatch Metrics & Alarms** (`cloudwatch_metric_alarms.py`): Programmatically provisions metric alarms for ALB 5XX error spikes (>10 errors/min) and EKS node CPU pressure (>80%) connected to SNS alert topics.
> 4. **Event-driven Lambda** (`s3_pdf_optimizer_trigger.py`): Triggers asynchronously on S3 `ObjectCreated` to log jobs into DynamoDB and queue processing."

---

### Q6: "How does Ansible fit into your stack?"
> **Answer**:
> "Ansible handles bare-metal and EC2 instance configuration management:
> - `setup-docker.yml` & `roles/docker`: Automates installation of Docker CE, containerd, and compose plugins across Ubuntu nodes.
> - `convpdf-app` role: Distributes environment templates, authenticates with AWS ECR, pulls updated images, and manages service lifecycle.
> - `security-hardening.yml`: Configures UFW firewall rules (denying all incoming except 22, 80, 443), installs `fail2ban`, and disables root SSH password authentication."

---

## 🚀 4. Quick Command Reference

```bash
# 1. Local Containerized Run
docker compose up -d --build
docker compose ps
curl http://localhost/health
curl http://localhost:5000/api/health

# 2. Kubernetes Deployment
kubectl apply -k k8s/
kubectl get pods -n convpdf
kubectl get hpa -n convpdf

# 3. Helm Deployment
helm upgrade --install convpdf ./helm/convpdf --namespace convpdf --create-namespace

# 4. Terraform Execution
cd terraform
terraform init
terraform plan -out=tfplan.binary
terraform apply tfplan.binary

# 5. Ansible Run
cd ansible
ansible-playbook -i inventory/production.ini playbooks/site.yml
ansible-playbook -i inventory/production.ini playbooks/security-hardening.yml

# 6. AWS Automation
python aws-automation/scripts/s3_cleanup_temp_files.py
python aws-automation/scripts/ec2_cost_optimizer.py status
python aws-automation/scripts/cloudwatch_metric_alarms.py
```
