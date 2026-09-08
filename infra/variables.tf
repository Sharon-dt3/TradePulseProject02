variable "aws_region" {
  description = "AWS region where TradePulse is deployed."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short DNS-safe application name."
  type        = string
  default     = "tradepulse"
}

variable "environment" {
  description = "Deployment environment identifier, such as production."
  type        = string
  default     = "production"
}

variable "deployment_mode" {
  description = "Use direct_alb_http for a temporary ALB URL deployment or custom_domain_https after a domain is configured."
  type        = string
  default     = "direct_alb_http"

  validation {
    condition     = contains(["direct_alb_http", "custom_domain_https"], var.deployment_mode)
    error_message = "deployment_mode must be either direct_alb_http or custom_domain_https."
  }
}

variable "dashboard_domain" {
  description = "Fully qualified dashboard hostname, required only for custom_domain_https mode."
  type        = string
  default     = null
  nullable    = true
}

variable "route53_zone_id" {
  description = "Route 53 hosted-zone ID for dashboard_domain. Required only when Terraform manages custom-domain DNS."
  type        = string
  default     = null
  nullable    = true
}

variable "dashboard_image" {
  description = "Immutable ECR image URI for the dashboard."
  type        = string
}

variable "ledger_core_image" {
  description = "Immutable ECR image URI for ledger-core."
  type        = string
}

variable "risk_engine_image" {
  description = "Immutable ECR image URI for risk-engine."
  type        = string
}

variable "gateway_image" {
  description = "Immutable ECR image URI for the SSE gateway."
  type        = string
}

variable "tick_producer_image" {
  description = "Immutable ECR image URI for the market tick producer."
  type        = string
}

variable "supabase_runtime_secret_arn" {
  description = "Secrets Manager ARN for a JSON object holding backend Supabase runtime configuration."
  type        = string
}

variable "finnhub_secret_arn" {
  description = "Secrets Manager ARN for a JSON object containing FINNHUB_API_KEY."
  type        = string
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "ecs_cpu" {
  description = "Fargate CPU units used by each API service."
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Fargate memory MiB used by each API service."
  type        = number
  default     = 1024
}
