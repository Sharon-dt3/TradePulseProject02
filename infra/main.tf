terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Application = "TradePulse"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  name_prefix       = "${var.project_name}-${var.environment}"
  direct_alb_origin = "http://${aws_lb.main.dns_name}"

  dashboard_origin = var.deployment_mode == "direct_alb_http" ? local.direct_alb_origin : "https://${var.dashboard_domain}"

  service_images = {
    dashboard     = var.dashboard_image
    ledger_core   = var.ledger_core_image
    risk_engine   = var.risk_engine_image
    gateway       = var.gateway_image
    tick_producer = var.tick_producer_image
  }

  public_hosts = {
    dashboard   = var.dashboard_domain
    ledger_core = var.dashboard_domain == null ? null : "api.${var.dashboard_domain}"
    risk_engine = var.dashboard_domain == null ? null : "risk.${var.dashboard_domain}"
    gateway     = var.dashboard_domain == null ? null : "stream.${var.dashboard_domain}"
  }
}
