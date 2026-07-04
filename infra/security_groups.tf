resource "aws_security_group" "apprunner" {
  name        = "smartcommerce-apprunner-sg"
  description = "Outbound access for App Runner VPC connector"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "smartcommerce-apprunner-sg" }
}

resource "aws_security_group_rule" "apprunner_to_rds" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  description              = "App Runner to RDS"
  source_security_group_id = aws_security_group.apprunner.id
  security_group_id        = var.rds_security_group_id
}
