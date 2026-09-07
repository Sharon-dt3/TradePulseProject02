"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import FormField, { inputCls } from "@/components/ui/FormField";
import { ledgerCoreFetch } from "@/lib/api/client";
import { ALL_ROLES } from "@/lib/roles";

/**
 * Admin's GET /admin/users + assign/remove role, replacing every
 * manual "INSERT INTO user_roles" this whole project relied on before
 * Phase 18 (see AdminUserController.java).
 */
export default function UsersTable() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [roleToAdd, setRoleToAdd] = useState({});

  const load = () => ledgerCoreFetch("/admin/users").then(setUsers).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const assign = async (userId) => {
    const role = roleToAdd[userId];
    if (!role) return;
    setBusyKey(`${userId}:add`);
    setError(null);
    try {
      await ledgerCoreFetch(`/admin/users/${userId}/roles/${role}`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const remove = async (userId, role) => {
    setBusyKey(`${userId}:${role}`);
    setError(null);
    try {
      await ledgerCoreFetch(`/admin/users/${userId}/roles/${role}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const columns = [
    { key: "email", label: "Email", sortable: true },
    {
      key: "roles",
      label: "Roles",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {row.roles.length === 0 && <span className="text-muted">no roles</span>}
          {row.roles.map((r) => (
            <span key={r} className="inline-flex items-center gap-1">
              <Badge tone="info">{r}</Badge>
              <button
                onClick={() => remove(row.userId, r)}
                disabled={busyKey === `${row.userId}:${r}`}
                className="text-xs text-muted hover:text-danger disabled:opacity-50"
                title={`Remove ${r}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "addRole",
      label: "Assign role",
      render: (row) => (
        <div className="flex items-center gap-2">
          <select
            className={inputCls}
            value={roleToAdd[row.userId] ?? ""}
            onChange={(e) => setRoleToAdd((prev) => ({ ...prev, [row.userId]: e.target.value }))}
          >
            <option value="">Select role...</option>
            {ALL_ROLES.filter((r) => !row.roles.includes(r)).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!roleToAdd[row.userId] || busyKey === `${row.userId}:add`}
            loading={busyKey === `${row.userId}:add`}
            onClick={() => assign(row.userId)}
          >
            Add
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card title="Users">
      <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>
      <DataTable columns={columns} rows={users} loading={users === null} rowKey="userId" emptyMessage="No users found." />
    </Card>
  );
}
