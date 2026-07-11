# Phase 1

# Values Terraform prints after "apply" (and that other scripts, like
# up.ps1, read back via `terraform output`) so you don't have to go dig
# through the AWS console to find them.

output "apprunner_url" {
  description = "HTTPS URL for the API (use this in the frontend)"
  value       = "https://${aws_apprunner_service.api.service_url}"
}

output "apprunner_service_arn" {
  description = "App Runner service ARN (used by up.ps1 / down.ps1)"
  value       = aws_apprunner_service.api.arn
}

output "s3_bucket_name" {
  description = "S3 bucket for product images"
  value       = aws_s3_bucket.product_images.bucket
}

output "s3_bucket_region" {
  description = "Region of the S3 bucket"
  value       = var.aws_region
}
