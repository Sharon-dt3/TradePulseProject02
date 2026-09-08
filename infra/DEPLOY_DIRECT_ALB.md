# Deploy TradePulse with an AWS ALB URL

This guide deploys TradePulse to ECS Fargate behind an AWS-generated Application Load Balancer (ALB) hostname. It does not require a custom domain or Route 53 hosted zone.

> **Security note:** The direct ALB hostname is HTTP-only. Use it only for an initial demonstration or temporary environment. Move to `custom_domain_https` before a production deployment.

## Prerequisites

Install and authenticate the following tools on your own machine:

- AWS CLI, authenticated to AWS account `063103766908`
- Docker
- Terraform 1.7 or later
- Git

Pull the deployment changes:

```bash
cd TradePulseProject02
git pull origin main
git rev-parse --short HEAD
```

The revision must be `3a94a27` or a later commit.

Set shell variables. These commands contain no secrets:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export IMAGE_TAG="$(git rev-parse --short HEAD)"
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
```

Confirm the account is correct:

```bash
aws sts get-caller-identity
```

## 1. Create ECR repositories

Create one repository for each container image:

```bash
for repository in \
  tradepulse-dashboard \
  tradepulse-ledger-core \
  tradepulse-risk-engine \
  tradepulse-gateway \
  tradepulse-tick-producer
do
  aws ecr create-repository \
    --repository-name "$repository" \
    --image-scanning-configuration scanOnPush=true \
    --region "$AWS_REGION" \
    2>/dev/null || true
done
```

Authenticate Docker to ECR:

```bash
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
```

## 2. Create AWS Secrets Manager secrets

Create two **JSON** secrets in AWS Secrets Manager. Do not put either secret JSON document in Terraform, Git, a shell history file, or chat.

### Supabase runtime secret

Create `tradepulse/production/supabase` with these keys:

| Key | Value source |
| --- | --- |
| `DATABASE_URL` | Full Supabase Transaction Pooler PostgreSQL URL, including the pooler username and URL-encoded password; used by risk-engine |
| `DATABASE_JDBC_URL` | Transaction Pooler JDBC URL without embedded credentials; used by ledger-core |
| `DATABASE_USERNAME` | Transaction Pooler username |
| `DATABASE_PASSWORD` | Database password |
| `MIGRATION_DATABASE_URL` | Supabase direct PostgreSQL JDBC connection URL, without embedded credentials |
| `MIGRATION_DATABASE_USERNAME` | Direct PostgreSQL username |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
| `SUPABASE_JWKS_URL` | `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_ISSUER` | `<SUPABASE_URL>/auth/v1` |

The application uses the Transaction Pooler for normal traffic and the direct connection for Flyway migrations. `DATABASE_URL` is consumed by the Python risk-engine and must remain a normal PostgreSQL URL, for example `postgresql://USER:URL_ENCODED_PASSWORD@HOST:6543/postgres`. `DATABASE_JDBC_URL` is consumed by ledger-core and must be the matching credential-free JDBC URL, for example `jdbc:postgresql://HOST:6543/postgres`.

### Finnhub secret

Create `tradepulse/production/finnhub` with this key:

| Key | Value source |
| --- | --- |
| `FINNHUB_API_KEY` | Finnhub API key |

Record only the two resulting **secret ARNs**. The ARNs are safe to place in `terraform.tfvars`; the secret values are not.

## 3. Build and push images

The dashboard uses Supabase public browser configuration at build time. The Supabase URL and anonymous key are public client values; never pass the service-role key or database credentials as Docker build arguments.

Set the two public values in your terminal without saving them to Git:

```bash
read -r -p "Supabase project URL: " NEXT_PUBLIC_SUPABASE_URL
read -r -s -p "Supabase anonymous key: " NEXT_PUBLIC_SUPABASE_ANON_KEY
echo
export NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Build and push all images:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -t "$ECR_REGISTRY/tradepulse-dashboard:$IMAGE_TAG" \
  dashboard
docker push "$ECR_REGISTRY/tradepulse-dashboard:$IMAGE_TAG"

docker build \
  -t "$ECR_REGISTRY/tradepulse-ledger-core:$IMAGE_TAG" \
  ledger-core
docker push "$ECR_REGISTRY/tradepulse-ledger-core:$IMAGE_TAG"

docker build \
  -t "$ECR_REGISTRY/tradepulse-risk-engine:$IMAGE_TAG" \
  risk-engine
docker push "$ECR_REGISTRY/tradepulse-risk-engine:$IMAGE_TAG"

docker build \
  -t "$ECR_REGISTRY/tradepulse-gateway:$IMAGE_TAG" \
  gateway
docker push "$ECR_REGISTRY/tradepulse-gateway:$IMAGE_TAG"

docker build \
  -t "$ECR_REGISTRY/tradepulse-tick-producer:$IMAGE_TAG" \
  tools/tick-producer
docker push "$ECR_REGISTRY/tradepulse-tick-producer:$IMAGE_TAG"
```

The dashboard defaults to same-origin API calls in AWS, so do not provide public ledger, risk, or gateway URLs for this direct-ALB build.

## 4. Configure Terraform

Create `infra/terraform.tfvars` locally from the example:

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and replace every placeholder with the account-specific image URI or secret ARN:

```hcl
aws_region      = "us-east-1"
project_name    = "tradepulse"
environment     = "production"
deployment_mode = "direct_alb_http"

dashboard_image     = "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tradepulse-dashboard:IMAGE_TAG"
ledger_core_image   = "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tradepulse-ledger-core:IMAGE_TAG"
risk_engine_image   = "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tradepulse-risk-engine:IMAGE_TAG"
gateway_image       = "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tradepulse-gateway:IMAGE_TAG"
tick_producer_image = "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tradepulse-tick-producer:IMAGE_TAG"

supabase_runtime_secret_arn = "SUPABASE_SECRET_ARN"
finnhub_secret_arn          = "FINNHUB_SECRET_ARN"
```

Keep this file uncommitted.

## 5. Provision AWS infrastructure

Initialize, review, and apply:

```bash
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

Provisioning creates a VPC, public and private subnets, one NAT gateway, an ALB, Redis, CloudWatch log groups, ECS roles, an ECS cluster, and the five ECS services.

> **Cost reminder:** NAT Gateway, ALB, ElastiCache, and ECS tasks incur AWS charges. Destroy the environment when it is no longer needed.

## 6. Retrieve and verify the deployment URL

After apply finishes:

```bash
terraform output dashboard_url
terraform output load_balancer_dns_name
```

Open the `dashboard_url` value. It has the form:

```text
http://tradepulse-production-alb-<identifier>.us-east-1.elb.amazonaws.com
```

If a service does not become healthy, inspect its ECS CloudWatch log group:

```bash
aws logs tail "/ecs/tradepulse-production/dashboard" --follow --region "$AWS_REGION"
aws logs tail "/ecs/tradepulse-production/ledger-core" --follow --region "$AWS_REGION"
aws logs tail "/ecs/tradepulse-production/risk-engine" --follow --region "$AWS_REGION"
aws logs tail "/ecs/tradepulse-production/gateway" --follow --region "$AWS_REGION"
aws logs tail "/ecs/tradepulse-production/tick-producer" --follow --region "$AWS_REGION"
```

## 7. Configure Supabase Auth

In Supabase Dashboard, add the final ALB URL to the Auth URL configuration:

- **Site URL:** the exact `dashboard_url` output
- **Additional Redirect URLs:** the same exact URL

Whether HTTP redirect URLs are permitted depends on the Supabase project’s current Auth security configuration. If Supabase rejects the HTTP URL, use a custom domain with HTTPS before enabling browser authentication.

## 8. Clean up when finished

To avoid continuing AWS charges:

```bash
terraform destroy
```

Confirm the destroy plan carefully before approving it. This removes the AWS resources managed by this Terraform configuration; it does not delete Supabase resources or Secrets Manager secrets.
