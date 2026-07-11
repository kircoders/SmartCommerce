# Phase 1

# Input variables for this Terraform config. Actual values are supplied in
# terraform.tfvars (gitignored where sensitive) — this file just declares
# what's expected and documents each one.

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# The RDS instance/security group already existed before this Terraform
# config was written, so it's referenced by ID rather than created here.
variable "rds_security_group_id" {
  description = "Security group ID of the existing RDS instance"
  type        = string
}

# Which image (and tag) App Runner should run. deploy.ps1 always pushes to
# the ":latest" tag, so this normally stays constant — App Runner is told to
# redeploy via `aws apprunner start-deployment`, not by changing this value.
variable "ecr_image" {
  description = "Full ECR image URI including tag"
  type        = string
}

# Points at the Secrets Manager secret holding DB creds + JWT secret.
# Terraform never touches the secret's contents directly — it just wires
# this ARN into the App Runner service so the running container can fetch
# it itself (see runtime_environment_secrets in apprunner.tf).
variable "secrets_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials and JWT secret"
  type        = string
}

# Not used by any resource in this config — kept here for reference/
# documentation of what the frontend URL is (relevant for CORS setup in the
# NestJS app itself, not in Terraform).
variable "amplify_url" {
  description = "Amplify frontend URL for CORS (informational only)"
  type        = string
  default     = "https://main.dwdi02ueunudy.amplifyapp.com"
}
