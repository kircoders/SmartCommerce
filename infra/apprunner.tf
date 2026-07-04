resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "smartcommerce"
  subnets            = data.aws_subnets.apprunner.ids
  security_groups    = [aws_security_group.apprunner.id]

  tags = { Name = "smartcommerce" }
}

resource "aws_apprunner_service" "api" {
  service_name = "smartcommerce-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }

    image_repository {
      image_identifier      = var.ecr_image
      image_repository_type = "ECR"

      image_configuration {
        port = "3000"

        runtime_environment_variables = {
          NODE_ENV = "production"
        }

        runtime_environment_secrets = {
          DB_HOST     = "${var.secrets_arn}:DB_HOST::"
          DB_PORT     = "${var.secrets_arn}:DB_PORT::"
          DB_NAME     = "${var.secrets_arn}:DB_NAME::"
          DB_USERNAME = "${var.secrets_arn}:DB_USERNAME::"
          DB_PASSWORD = "${var.secrets_arn}:DB_PASSWORD::"
          JWT_SECRET  = "${var.secrets_arn}:JWT_SECRET::"
        }
      }
    }

    auto_deployments_enabled = false
  }

  instance_configuration {
    cpu               = "256"
    memory            = "512"
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    ingress_configuration {
      is_publicly_accessible = true
    }
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = { Name = "smartcommerce-api" }
}
