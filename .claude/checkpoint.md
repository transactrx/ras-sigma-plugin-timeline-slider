# Checkpoint: CloudFront Deployment Plan

**Date**: 2026-03-19
**Branch**: `setup`
**Status**: Plan agreed upon. Implementation not yet started.

## What Was Done

- Added Mac-specific entries to `.gitignore`
- Created `.claude/` folder with project-guide skill and initial checkpoint
- Researched existing AWS infrastructure (ras_aws_infrastructure + terraform-infrastructure)
- Designed deployment plan for hosting Sigma plugin on S3 + CloudFront

## Deployment Plan: S3 + CloudFront for Sigma Plugins

### Why a Separate Distribution
The existing CloudFront distribution serves the main app (NLB origin, mytransactrx.io/.net domains, WAF, geo-restriction). A separate lightweight S3 + CloudFront setup is cleaner for static plugin hosting.

### Architecture
- **S3 Bucket**: `transactrx-sigma-plugins-{env}` with subfolder per plugin (e.g., `timeline-slider/`)
- **CloudFront**: New distribution with S3 origin via Origin Access Control (not public bucket)
- **Cache Strategy**: Aggressive caching on `assets/*`, short TTL on `index.html`
- **HTTPS**: Default CloudFront domain is sufficient for Sigma plugin registration
- **Deploy**: GitHub Actions (OIDC auth, us-east-1) — `npm build` then `s3 sync` + CloudFront invalidation

### Open Decisions
1. **Custom domain?** Could use `plugins.mytransactrx.net` with ACM cert, or default CloudFront URL (`d1234.cloudfront.net`). Default is fine for Sigma.
2. **Geo-restriction?** Existing infra uses US/Canada only — apply same here?
3. **Terraform location?** Recommendation: new module in `terraform-infrastructure` (e.g., `sigma-plugins/`)
4. **Multi-plugin bucket?** S3 structure supports multiple plugins under one distribution, each in its own subfolder.

### Existing Infra Context
- **Region**: us-east-1
- **AWS Profiles**: Development (386128822572), Production (578577428029)
- **Terraform State**: `transactrx-infrastructure-terraform` bucket, `terraform-lock` DynamoDB
- **CI/CD Pattern**: GitHub Actions with OIDC role assumption, Terraform apply, Docker/ECR push
- **Log Buckets**: `transactrx-aws-{env}-logs` with CloudFront prefix, lifecycle to GLACIER at 90 days

## Next Steps

1. Decide on the four open questions above
2. Create Terraform module in `terraform-infrastructure` for S3 bucket + CloudFront distribution + OAC
3. Create GitHub Actions workflow in this repo for build + deploy
4. Register the CloudFront URL as a custom plugin in Sigma
5. Test end-to-end in Development environment before promoting to Production
