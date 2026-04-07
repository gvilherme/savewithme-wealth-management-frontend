variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name used as resource prefix"
  type        = string
  default     = "savewithme-frontend"
}

variable "github_repo" {
  description = "GitHub repository in the format owner/repo"
  type        = string
  default     = "gvilherme/savewithme-wealth-management-frontend"
}

variable "domain_name" {
  description = "Custom domain for the frontend (subdomain do GoDaddy)"
  type        = string
  default     = "savewithme.lorixlabs.com"
}
