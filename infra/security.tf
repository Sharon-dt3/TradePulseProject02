resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb"
  description = "Accept public HTTPS traffic for TradePulse."
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from the internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Traffic to ECS services"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "service" {
  name        = "${local.name_prefix}-services"
  description = "Only the application load balancer may reach public ECS services."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Dashboard and API traffic from ALB"
    from_port       = 3000
    to_port         = 8081
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Outbound access to Supabase, AWS APIs, and external market feeds"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis"
  description = "Only ECS services may access the Redis stream broker."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis streams from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.service.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
