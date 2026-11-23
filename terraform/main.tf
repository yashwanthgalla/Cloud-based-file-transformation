# ============================================================
# Root Terraform Orchestration for Cloud File Optimization
# ============================================================

# 1. Virtual Private Cloud (Networking)
module "vpc" {
  source             = "./modules/vpc"
  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# 2. Security Groups & Network Access Control
module "security" {
  source       = "./modules/security"
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
}

# 3. Amazon S3 Storage for PDF Files & Temporary Processed Blobs
module "s3" {
  source       = "./modules/s3"
  project_name = var.project_name
  environment  = var.environment
}

# 4. Amazon ECR (Elastic Container Registry) for Container Images
module "ecr" {
  source       = "./modules/ecr"
  project_name = var.project_name
  environment  = var.environment
}

# 5. Amazon EKS (Elastic Kubernetes Service) Cluster
module "eks" {
  source          = "./modules/eks"
  project_name    = var.project_name
  environment     = var.environment
  cluster_version = var.cluster_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  instance_types  = var.instance_types
}
