# Runtime secrets are stored in AWS Secrets Manager and injected directly into
# ECS task definitions in ecs.tf. Keeping values out of Terraform variables,
# state, plans, and local variable files prevents database credentials and
# Supabase server keys from leaking through deployment artifacts.
#
# Supabase remains the sole Postgres provider for TradePulse. The application
# connection details are referenced by secret ARN in terraform.tfvars and are
# resolved by ECS only at task startup.
