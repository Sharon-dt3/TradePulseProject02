# Phase 0: security groups, with no RDS ingress rule.
#
# Greenfield — there was never an RDS instance in this repo to remove
# ingress for. Database traffic goes to Supabase over the public internet
# (TLS-terminated at Supabase's pooler/direct endpoints), not to an
# in-VPC RDS instance, so no inbound rule for Postgres (5432/6543) is
# needed here at all.

resource "aws_security_group" "app_egress" {
  name        = "tradepulse-app-egress"
  description = "Egress-only security group for ledger-core/risk-engine — outbound HTTPS to Supabase, no inbound DB rule since there is no RDS instance"

  egress {
    description = "HTTPS to Supabase (pooled + direct Postgres, both over TLS on the pooler/direct endpoints; also JWKS/Auth API)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Supavisor pooled (6543) and direct (5432) both ride over the same
  # public internet path as HTTPS in Supabase's managed setup — no
  # separate port-level egress rule is required beyond 443 in the common
  # case. If a future networking decision needs explicit 5432/6543 egress,
  # add it here with a comment explaining why, rather than silently.

  tags = {
    Project = "tradepulse"
    Phase   = "0"
  }
}

# No aws_db_instance, no RDS security group, no RDS ingress rule anywhere
# in this file or this repo (see infra/secrets.tf's OD-0/OD-1 note).
