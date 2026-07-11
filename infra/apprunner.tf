# Phase 1

# The VPC connector lets App Runner reach into your VPC — this is what allows
# the API (which is publicly accessible from the internet) to talk to RDS,
# which lives inside the VPC and isn't exposed publicly.
resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "smartcommerce"
  subnets            = data.aws_subnets.apprunner.ids
  security_groups    = [aws_security_group.apprunner.id]

  tags = { Name = "smartcommerce" }
}

# The actual App Runner service — this is what runs the NestJS API container.
resource "aws_apprunner_service" "api" {
  service_name = "smartcommerce-api"

  source_configuration {
    # Which IAM role App Runner uses to pull the image from ECR (build-time,
    # not the same as the role the running app uses — see iam.tf).
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }

    image_repository {
      image_identifier      = var.ecr_image
      image_repository_type = "ECR"

      image_configuration {
        port = "3000"

        # Plain (non-secret) env vars baked into the container config.
        runtime_environment_variables = {
          NODE_ENV = "production"
        }

        # Secret values are pulled live from Secrets Manager at container
        # start — nothing sensitive is ever stored in this Terraform config
        # or in plaintext env vars.
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

    # Deploying a new image (via deploy.ps1) requires explicitly triggering
    # a deployment — App Runner won't auto-redeploy just because a new
    # ":latest" image landed in ECR.
    auto_deployments_enabled = false
  }

  # Compute size for the container. 256 vCPU units / 512 MB RAM is the
  # smallest App Runner tier — plenty for a low-traffic personal project.
  instance_configuration {
    cpu               = "256"
    memory            = "512"
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    # The API itself is reachable from the public internet...
    ingress_configuration {
      is_publicly_accessible = true
    }
    # ...but outbound traffic (e.g. to RDS) goes through the VPC connector
    # instead of the open internet.
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  # App Runner pings this endpoint to decide if the container is healthy
  # enough to receive traffic.
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
