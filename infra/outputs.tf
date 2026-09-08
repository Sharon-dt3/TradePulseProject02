output "load_balancer_dns_name" {
  description = "AWS-managed hostname for the TradePulse Application Load Balancer."
  value       = aws_lb.main.dns_name
}

output "dashboard_url" {
  description = "Dashboard URL for the selected deployment mode."
  value       = local.dashboard_origin
}

output "api_url" {
  description = "Ledger Core API base URL. Direct ALB mode uses the same origin with API paths."
  value       = local.dashboard_origin
}

output "risk_url" {
  description = "Risk Engine API base URL. Direct ALB mode uses the /risk path."
  value       = local.dashboard_origin
}

output "stream_url" {
  description = "SSE Gateway base URL. Direct ALB mode uses the /sse path."
  value       = local.dashboard_origin
}

output "redis_primary_endpoint" {
  description = "Private Redis endpoint used only by ECS tasks."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}
