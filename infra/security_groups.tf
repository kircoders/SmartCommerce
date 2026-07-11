# Phase 1

# Security group attached to the App Runner VPC connector. This controls
# what the running API is allowed to talk to (and be talked to by) inside
# the VPC — separate from App Runner's public internet ingress, which is
# configured directly on the service in apprunner.tf.
resource "aws_security_group" "apprunner" {
  name        = "smartcommerce-apprunner-sg"
  description = "Outbound access for App Runner VPC connector"
  vpc_id      = data.aws_vpc.default.id

  # Allow all outbound traffic — needed so the API can reach RDS, Secrets
  # Manager, S3, etc. (Inbound is locked down to just RDS via the rule
  # below; there's no general inbound rule here.)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "smartcommerce-apprunner-sg" }
}

# This is the other half of the connection: it opens up the RDS security
# group (defined outside Terraform — see main.tf's data source) to accept
# Postgres traffic (port 5432), but ONLY from the App Runner security group
# above, not from the whole internet or VPC.
resource "aws_security_group_rule" "apprunner_to_rds" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  description              = "App Runner to RDS"
  source_security_group_id = aws_security_group.apprunner.id
  security_group_id        = var.rds_security_group_id
}
