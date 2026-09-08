output "load_balancer_dns_name" {
  description = "AWS-managed hostname for the TradePulse Application Load Balancer."
  value       = aws_lb.main.dns_name
}

output "dashboard_url" {
  description = "Production dashboard URL after DNS and ACM validation complete."
  value       = "https://${local.public_hosts.dashboard}"
}

output "api_url" {
  description = "Production ledger-core API base URL."
  value       = "https://${local.public_hosts.ledger_core}"
}

output "risk_url" {
  description = "Production risk-engine API base URL."
  value       = "https://${local.public_hosts.risk_engine}"
}

output "stream_url" {
  description = "Production SSE gateway base URL."
  value       = "https://${local.public_hosts.gateway}"
}

output "redis_primary_endpoint" {
  description = "Private Redis endpoint used only by ECS tasks."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}
