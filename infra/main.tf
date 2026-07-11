# Phase 1

# Terraform bootstrap: which provider we're using and where.
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Every AWS resource below gets created in this region.
provider "aws" {
  region = var.aws_region
}

# ── Data sources for pre-existing permanent resources ────────────────────────
# "data" blocks don't create anything — they just look up resources that
# already exist so the rest of the config can reference them.

# The default VPC that already exists in this AWS account.
data "aws_vpc" "default" {
  default = true
}

# All subnets inside that default VPC.
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# App Runner doesn't support all AZs — filter to ones that work
# (App Runner's VPC connector only works in a subset of Availability Zones,
# so we can't just reuse the "default" subnets above for it.)
data "aws_subnets" "apprunner" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "availabilityZoneId"
    values = ["use1-az1", "use1-az2", "use1-az4", "use1-az6"]
  }
}

# Permanent resources — NOT managed by this config, just referenced
# The RDS security group was created outside Terraform (manually / via console),
# so we just look it up by ID rather than trying to own/manage it here.
data "aws_security_group" "rds" {
  id = var.rds_security_group_id
}
