# Phase 1

# App Runner needs two separate roles because two different things need
# permissions at two different times:
#   1. "access" role — used ONCE, at build/deploy time, just to pull the
#      Docker image out of ECR.
#   2. "instance" role — used continuously, by the running container itself,
#      to call other AWS services (Secrets Manager, S3, etc.) while it's live.

# Allows App Runner to pull images from ECR (build-time role)
resource "aws_iam_role" "apprunner_access" {
  name        = "smartcommerce-apprunner-access-role"
  description = "Allows App Runner to pull images from ECR"

  # "assume_role_policy" (aka the trust policy) says WHO is allowed to use
  # this role. Here, only the App Runner build service itself can assume it.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# AWS-managed policy that grants exactly the ECR read permissions App Runner
# needs — no need to hand-write this one.
resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Allows the running application to access AWS services (runtime role)
resource "aws_iam_role" "apprunner_instance" {
  name        = "smartcommerce-apprunner-instance-role"
  description = "Runtime role for App Runner - Secrets Manager + SSM access"

  # Trust policy: only App Runner's task runtime (the actual running
  # container) can assume this role — distinct from the build service above.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Custom (hand-written) policy — the permissions the NestJS app actually
# needs while running: read the DB/JWT secret, and read SSM parameters
# scoped to this project only (least-privilege: it can't touch anything
# outside "smartcommerce/*").
resource "aws_iam_role_policy" "apprunner_instance_policy" {
  name = "smartcommerce-apprunner-instance-policy"
  role = aws_iam_role.apprunner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = var.secrets_arn
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${var.aws_region}:452698428461:parameter/smartcommerce/*"
      }
    ]
  })
}
