# Allows App Runner to pull images from ECR (build-time role)
resource "aws_iam_role" "apprunner_access" {
  name        = "smartcommerce-apprunner-access-role"
  description = "Allows App Runner to pull images from ECR"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Allows the running application to access AWS services (runtime role)
resource "aws_iam_role" "apprunner_instance" {
  name        = "smartcommerce-apprunner-instance-role"
  description = "Runtime role for App Runner - Secrets Manager + SSM access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

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
