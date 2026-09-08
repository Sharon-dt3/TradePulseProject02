resource "aws_cloudwatch_log_group" "service" {
  for_each = local.service_images

  name              = "/ecs/${local.name_prefix}/${replace(each.key, "_", "-")}"
  retention_in_days = 30
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${local.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "read-runtime-secrets"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [var.supabase_runtime_secret_arn, var.finnhub_secret_arn]
    }]
  })
}

resource "aws_iam_role" "task" {
  name               = "${local.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json
}

locals {
  redis_host = aws_elasticache_replication_group.redis.primary_endpoint_address

  backend_secrets = [
    { name = "DATABASE_URL", valueFrom = "${var.supabase_runtime_secret_arn}:DATABASE_URL::" },
    { name = "SPRING_DATASOURCE_URL", valueFrom = "${var.supabase_runtime_secret_arn}:DATABASE_JDBC_URL::" },
    { name = "SPRING_DATASOURCE_USERNAME", valueFrom = "${var.supabase_runtime_secret_arn}:DATABASE_USERNAME::" },
    { name = "SPRING_DATASOURCE_PASSWORD", valueFrom = "${var.supabase_runtime_secret_arn}:DATABASE_PASSWORD::" },
    { name = "SPRING_FLYWAY_URL", valueFrom = "${var.supabase_runtime_secret_arn}:MIGRATION_DATABASE_URL::" },
    { name = "SPRING_FLYWAY_USERNAME", valueFrom = "${var.supabase_runtime_secret_arn}:MIGRATION_DATABASE_USERNAME::" },
    { name = "SPRING_FLYWAY_PASSWORD", valueFrom = "${var.supabase_runtime_secret_arn}:DATABASE_PASSWORD::" },
    { name = "SUPABASE_URL", valueFrom = "${var.supabase_runtime_secret_arn}:SUPABASE_URL::" },
    { name = "SUPABASE_SERVICE_ROLE_KEY", valueFrom = "${var.supabase_runtime_secret_arn}:SUPABASE_SERVICE_ROLE_KEY::" },
    { name = "SUPABASE_JWKS_URL", valueFrom = "${var.supabase_runtime_secret_arn}:SUPABASE_JWKS_URL::" },
    { name = "SUPABASE_JWT_ISSUER", valueFrom = "${var.supabase_runtime_secret_arn}:SUPABASE_JWT_ISSUER::" }
  ]

  service_definitions = {
    dashboard = {
      port        = 3000
      health_path = "/"
      image       = var.dashboard_image
      environment = []
      secrets     = []
    }
    ledger_core = {
      port        = 8080
      health_path = "/actuator/health"
      image       = var.ledger_core_image
      environment = [
        { name = "REDIS_HOST", value = local.redis_host },
        { name = "REDIS_PORT", value = "6379" },
        { name = "LEDGER_CORS_ALLOWED_ORIGINS", value = local.dashboard_origin }
      ]
      secrets = local.backend_secrets
    }
    risk_engine = {
      port        = 8001
      health_path = "/healthz"
      image       = var.risk_engine_image
      environment = [
        { name = "REDIS_HOST", value = local.redis_host },
        { name = "REDIS_PORT", value = "6379" },
        { name = "DASHBOARD_ALLOWED_ORIGIN", value = local.dashboard_origin },
        { name = "RISK_FREE_RATE_ANNUAL", value = "0.00" }
      ]
      secrets = local.backend_secrets
    }
    gateway = {
      port        = 8081
      health_path = "/healthz"
      image       = var.gateway_image
      environment = [
        { name = "REDIS_HOST", value = local.redis_host },
        { name = "REDIS_PORT", value = "6379" },
        { name = "GATEWAY_CORS_ALLOWED_ORIGINS", value = local.dashboard_origin }
      ]
      secrets = [
        { name = "SUPABASE_JWKS_URL", valueFrom = "${var.supabase_runtime_secret_arn}:SUPABASE_JWKS_URL::" },
        { name = "SUPABASE_JWT_ISSUER", valueFrom = "${var.supabase_runtime_secret_arn}:SUPABASE_JWT_ISSUER::" }
      ]
    }
    tick_producer = {
      port        = null
      health_path = null
      image       = var.tick_producer_image
      environment = [
        { name = "REDIS_HOST", value = local.redis_host },
        { name = "REDIS_PORT", value = "6379" }
      ]
      secrets = [
        { name = "FINNHUB_API_KEY", valueFrom = "${var.finnhub_secret_arn}:FINNHUB_API_KEY::" }
      ]
    }
  }
}

resource "aws_ecs_task_definition" "service" {
  for_each = local.service_definitions

  family                   = "${local.name_prefix}-${replace(each.key, "_", "-")}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.key == "tick_producer" ? 256 : var.ecs_cpu
  memory                   = each.key == "tick_producer" ? 512 : var.ecs_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name        = replace(each.key, "_", "-")
    image       = each.value.image
    essential   = true
    environment = each.value.environment
    secrets     = each.value.secrets
    portMappings = each.value.port == null ? [] : [{
      containerPort = each.value.port
      hostPort      = each.value.port
      protocol      = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service[each.key].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "service" {
  for_each = local.service_definitions

  name            = "${local.name_prefix}-${replace(each.key, "_", "-")}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.service[each.key].arn
  desired_count   = each.key == "tick_producer" ? 1 : 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = each.value.port == null ? [] : [each.value]
    content {
      target_group_arn = aws_lb_target_group.service[each.key].arn
      container_name   = replace(each.key, "_", "-")
      container_port   = each.value.port
    }
  }

  depends_on = [aws_lb_listener.http]
}
