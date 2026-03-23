# Checkpoint: S3 + CloudFront Deployment Setup

**Date**: 2026-03-20
**Branch**: `setup`
**Status**: Blocked on CloudFront IAM permissions — awaiting AWS team decision.

## What Was Done

- Added `base: '/timeline-slider/'` to `vite.config.js` (committed)
- Explored and rejected approach of putting Terraform in `terraform-infrastructure` repo
- Researched org patterns: `ras_aws_infrastructure`, `data_science_airflow`, `powerlineDataWarehouse`
- Identified GitHub Organization Secrets: `PROCESSOR_DEVELOPMENT_AWS_ROLE_ARN`, `PROCESSOR_PRODUCTION_AWS_ROLE_ARN`

## Key Decisions Made

1. **Terraform lives in THIS repo** (not `terraform-infrastructure`), following `ras_aws_infrastructure` pattern
2. **Use existing org secrets** (`PROCESSOR_` prefix) instead of creating new IAM roles
3. **S3 bucket naming**: `ras.sigma.{env}.plugins`
4. **Geo-restriction**: US + CA
5. **Default CloudFront domain** (no custom domain needed for Sigma)

## Blocker: CloudFront Permissions

The `github-actions` role (behind PROCESSOR_ org secrets) does **NOT** have `cloudfront:*` permissions.

### What the role HAS:
`s3:*`, `ecr:*`, `ecs:*`, `batch:*`, `logs:*`, `ssm:Get*/Desc*`, broad IAM (CreateRole/AttachRolePolicy/PutRolePolicy), `ec2` (limited), `elasticloadbalancing:*`, `route53:*`, `ses:*`, `sns:*`, `secretsmanager:*`

### What the role is MISSING:
`cloudfront:*` — needed for Terraform to create the distribution AND for deploy workflow to run `create-invalidation`

### Options for AWS Team:
1. **Add `cloudfront:*` to the shared module** (`terraform-infrastructure/infrastructure/modules/account-github-actions-integration/permissions.tf`) — cleanest, affects all accounts
2. **This repo's Terraform attaches a CloudFront inline policy to the existing `github-actions` role** — self-contained but modifies a shared role
3. **Skip CloudFront entirely** — use S3 static website hosting directly (loses HTTPS/caching benefits)

**Note:** Options 1 or 2 are required — Terraform needs CloudFront permissions to create the distribution.

## Established Patterns (for implementation after blocker resolves)

### Workflow pattern (from `ras_aws_infrastructure`):
```yaml
# Dynamic role: PROCESSOR_{BRANCH_UPPER}_AWS_ROLE_ARN
# Backend from SSM: terraform_state_bucket_name, terraform_lock_table
# terraform init -backend-config=... with dynamic values
# terraform apply -auto-approve
```

### Terraform backend pattern:
```hcl
terraform {
  backend "s3" {
    encrypt = true
    region  = "us-east-1"
  }
}
# bucket/key/lock_table injected at init time via SSM
```

## What's Left After Blocker Resolves
1. Create `terraform/` directory with S3 + CloudFront + OAC + bucket policy resources
2. Create `.github/workflows/deploy.yml` using PROCESSOR_ prefix pattern
3. `terraform apply` via GitHub Actions on push to Development
4. Register plugin URL in Sigma: `https://{cf-domain}/timeline-slider/index.html`
