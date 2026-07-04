variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "rds_security_group_id" {
  description = "Security group ID of the existing RDS instance"
  type        = string
}

variable "ecr_image" {
  description = "Full ECR image URI including tag"
  type        = string
}

variable "secrets_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials and JWT secret"
  type        = string
}

variable "amplify_url" {
  description = "Amplify frontend URL for CORS (informational only)"
  type        = string
  default     = "https://main.dwdi02ueunudy.amplifyapp.com"
}
