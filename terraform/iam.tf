# Reutiliza o OIDC provider do GitHub criado pelo infra repo (se existir)
# ou cria um novo caso seja a primeira vez nessa conta
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_arn = data.aws_iam_openid_connect_provider.github.arn
  oidc_subject_prefix = "repo:${var.github_repo}:ref:refs/heads/"
}

# ─── Plan role (read-only: tf-plan.yml) ──────────────────────────────────────

resource "aws_iam_role" "plan" {
  name = "${var.app_name}-plan-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.github_oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "plan" {
  name = "${var.app_name}-plan-policy"
  role = aws_iam_role.plan.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3StateRead"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:ListBucket"]
        Resource = ["arn:aws:s3:::*"]
      },
      {
        Sid    = "CloudFrontRead"
        Effect = "Allow"
        Action = ["cloudfront:Get*", "cloudfront:List*"]
        Resource = "*"
      },
      {
        Sid    = "IAMRead"
        Effect = "Allow"
        Action = ["iam:Get*", "iam:List*"]
        Resource = "*"
      },
      {
        Sid    = "ACMRead"
        Effect = "Allow"
        Action = ["acm:Describe*", "acm:Get*", "acm:List*"]
        Resource = "*"
      }
    ]
  })
}

# ─── Deploy role (tf-apply.yml + deploy.yml) ─────────────────────────────────

resource "aws_iam_role" "deploy" {
  name = "${var.app_name}-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.github_oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:ref:refs/heads/main"
        }
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  name = "${var.app_name}-deploy-policy"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Full"
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*"
        ]
      },
      {
        Sid    = "CloudFrontInvalidate"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:Get*",
          "cloudfront:List*",
          "cloudfront:UpdateDistribution",
          "cloudfront:TagResource"
        ]
        Resource = aws_cloudfront_distribution.frontend.arn
      },
      {
        Sid    = "IAMManage"
        Effect = "Allow"
        Action = ["iam:*"]
        Resource = [
          aws_iam_role.plan.arn,
          aws_iam_role.deploy.arn
        ]
      },
      {
        Sid    = "TFStateWrite"
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = ["arn:aws:s3:::*"]
      },
      {
        Sid    = "ACMManage"
        Effect = "Allow"
        Action = ["acm:*"]
        Resource = "*"
      }
    ]
  })
}
