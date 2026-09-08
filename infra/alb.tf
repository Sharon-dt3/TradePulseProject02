resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  # Long enough for the ticket-authenticated server-sent-events connection.
  idle_timeout = 300
}

resource "aws_lb_target_group" "service" {
  for_each = {
    for name, service in local.service_definitions : name => service
    if service.port != null
  }

  name        = substr("${local.name_prefix}-${replace(each.key, "_", "-")}", 0, 32)
  port        = each.value.port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = each.value.health_path
    protocol            = "HTTP"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
  }
}

# Direct ALB mode requires no domain or certificate. The default route sends
# dashboard requests to Next.js; API, risk, and SSE routes below take priority.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["dashboard"].arn
  }
}

resource "aws_lb_listener_rule" "risk_api_paths" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["risk_engine"].arn
  }

  condition {
    path_pattern {
      # /risk is a Next.js dashboard page. Only these authenticated API
      # endpoints are sent to the risk-engine service.
      values = ["/risk/me", "/risk/me/*", "/risk/aggregate"]
    }
  }
}

resource "aws_lb_listener_rule" "gateway_paths" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["gateway"].arn
  }

  condition {
    path_pattern {
      values = ["/sse", "/healthz"]
    }
  }
}

resource "aws_lb_listener_rule" "ledger_core_paths_primary" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["ledger_core"].arn
  }

  condition {
    path_pattern {
      values = [
        "/accounts",
        "/accounts/*",
        "/admin/*",
        "/audit/*",
        "/compliance/*"
      ]
    }
  }
}

resource "aws_lb_listener_rule" "ledger_core_paths_secondary" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 31

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["ledger_core"].arn
  }

  condition {
    # ALB permits at most five path patterns in one condition.
    path_pattern {
      values = [
        "/ledger/*",
        "/market/*",
        "/orders",
        "/orders/*",
        "/positions"
      ]
    }
  }
}

resource "aws_lb_listener_rule" "ledger_core_paths_tertiary" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 32

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["ledger_core"].arn
  }

  condition {
    path_pattern {
      values = [
        "/statements/*",
        "/stream/tickets",
        "/trades",
        "/trades/*"
      ]
    }
  }
}

# HTTPS is enabled only after a domain is available. The direct ALB hostname
# cannot be covered by an ACM certificate owned by this account.
resource "aws_acm_certificate" "main" {
  count = var.deployment_mode == "custom_domain_https" ? 1 : 0

  domain_name               = var.dashboard_domain
  subject_alternative_names = ["*.${var.dashboard_domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = var.deployment_mode == "custom_domain_https" && var.route53_zone_id != null ? {
    for option in aws_acm_certificate.main[0].domain_validation_options :
    option.resource_record_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  records = [each.value.record]
  type    = each.value.type
  ttl     = 60
}

resource "aws_acm_certificate_validation" "main" {
  count = var.deployment_mode == "custom_domain_https" && var.route53_zone_id != null ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_lb_listener" "https" {
  count = var.deployment_mode == "custom_domain_https" && var.route53_zone_id != null ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate_validation.main[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["dashboard"].arn
  }
}

resource "aws_route53_record" "application" {
  for_each = var.deployment_mode == "custom_domain_https" && var.route53_zone_id != null ? local.public_hosts : {}

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
