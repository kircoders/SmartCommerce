output "apprunner_url" {
  description = "HTTPS URL for the API (use this in the frontend)"
  value       = "https://${aws_apprunner_service.api.service_url}"
}

output "apprunner_service_arn" {
  description = "App Runner service ARN (used by up.ps1 / down.ps1)"
  value       = aws_apprunner_service.api.arn
}
