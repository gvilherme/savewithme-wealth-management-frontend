output "s3_bucket" {
  description = "Nome do bucket S3 do frontend"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "ID da distribuição CloudFront"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_url" {
  description = "URL pública do frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "plan_role_arn" {
  description = "ARN da role OIDC para tf-plan (ROLE_ARN_PLAN secret)"
  value       = aws_iam_role.plan.arn
}

output "deploy_role_arn" {
  description = "ARN da role OIDC para tf-apply + deploy (ROLE_ARN_DEPLOY secret)"
  value       = aws_iam_role.deploy.arn
}
