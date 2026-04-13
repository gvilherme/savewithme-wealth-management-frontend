output "s3_bucket" {
  description = "Nome do bucket S3 do frontend"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "ID da distribuição CloudFront"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_url" {
  description = "URL pública do frontend (domínio CloudFront padrão)"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_url" {
  description = "URL final do frontend com domínio customizado"
  value       = "https://${var.domain_name}"
}

output "cloudfront_domain_name" {
  description = "Domínio CloudFront — adicionar CNAME no GoDaddy: savewithme → este valor"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

# ─── ACM: registros para validação DNS no GoDaddy ────────────────────────────
# Após o primeiro apply, adicione estes dois CNAMEs no GoDaddy (em DNS Management)
# para que o ACM emita o certificado SSL. Sem isso, o apply fica aguardando.

output "acm_validation_cname_name" {
  description = "Nome do CNAME de validação ACM — adicionar no GoDaddy"
  value       = tolist(aws_acm_certificate.frontend.domain_validation_options)[0].resource_record_name
}

output "acm_validation_cname_value" {
  description = "Valor do CNAME de validação ACM — adicionar no GoDaddy"
  value       = tolist(aws_acm_certificate.frontend.domain_validation_options)[0].resource_record_value
}

output "plan_role_arn" {
  description = "ARN da role OIDC para tf-plan (ROLE_ARN_PLAN secret)"
  value       = aws_iam_role.plan.arn
}

output "deploy_role_arn" {
  description = "ARN da role OIDC para tf-apply + deploy (ROLE_ARN_DEPLOY secret)"
  value       = aws_iam_role.deploy.arn
}
