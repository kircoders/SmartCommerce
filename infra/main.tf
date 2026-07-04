terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Data sources for pre-existing permanent resources ────────────────────────

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# App Runner doesn't support all AZs — filter to ones that work
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
data "aws_security_group" "rds" {
  id = var.rds_security_group_id
}
