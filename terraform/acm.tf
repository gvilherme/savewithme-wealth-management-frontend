resource "aws_acm_certificate" "frontend" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.app_name}-cert"
  }
}

# Bloqueia até o ACM confirmar a validação via DNS.
# Antes de executar o apply, adicione o CNAME de validação no GoDaddy
# (visível nos outputs logo após a criação do certificado).
resource "aws_acm_certificate_validation" "frontend" {
  certificate_arn = aws_acm_certificate.frontend.arn

  timeouts {
    create = "45m"
  }
}
