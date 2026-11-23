# Phase 2

# App Runner's egress_type = "VPC" (in apprunner.tf) routes ALL outbound
# traffic through the VPC connector's private-IP network interfaces - which
# is required for reaching RDS (also inside the VPC), but as a side effect
# also routes calls to S3 through the VPC instead of the public internet.
# The default VPC has no NAT Gateway, so those private-IP interfaces have no
# actual path to S3's public endpoint - uploads/deletes to S3 just hang
# until they time out.
#
# A Gateway-type VPC endpoint for S3 fixes this for free (unlike a NAT
# Gateway, which costs ~$32/month + data fees): it adds a route so traffic
# to S3 stays inside AWS's network entirely, without ever needing to reach
# the public internet.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = data.aws_vpc.default.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = data.aws_route_tables.default.ids

  tags = { Name = "smartcommerce-s3-endpoint" }
}

data "aws_route_tables" "default" {
  vpc_id = data.aws_vpc.default.id
}

# Phase 12: same problem for Bedrock (the AI assistant) - calls hang and
# time out. Bedrock has no free Gateway endpoint, only an Interface
# endpoint (~$0.01/hour). So the endpoint itself is NOT created here:
# up.ps1 creates it and down.ps1 deletes it, so it only costs money while
# the app is running. Terraform only owns the free parts below - the
# security group and the two values the scripts need.

# Lets the API (App Runner security group) reach the endpoint over HTTPS.
# Nothing else can connect to it.
resource "aws_security_group" "bedrock_endpoint" {
  name        = "smartcommerce-bedrock-endpoint-sg"
  description = "HTTPS from App Runner to the Bedrock VPC endpoint"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "HTTPS from App Runner"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.apprunner.id]
  }

  tags = { Name = "smartcommerce-bedrock-endpoint-sg" }
}
