import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Users,
  ShieldCheck,
  UserRound,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "./AdminUsers.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data =
    response.status === 204
      ? null
      : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

function getInitials(name) {
  if (!name) return "U";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function normalizeUsers(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ role: "user", is_active: true });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 8;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/admin/users");
      setUsers(normalizeUsers(data));
    } catch (err) {
      setError(err.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      String(user.full_name || user.name || "")
        .toLowerCase()
        .includes(query) ||
      String(user.email || "")
        .toLowerCase()
        .includes(query) ||
      String(user.phone || "")
        .toLowerCase()
        .includes(query);

    const role = String(user.role || "user").toLowerCase();
    const matchesRole = roleFilter === "all" || role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalAdmins = users.filter(
    (user) => String(user.role || "").toLowerCase() === "admin"
  ).length;

  const activeUsers = users.filter((user) => user.is_active !== false).length;

  const openEdit = (user) => {
    setSelectedUser(user);
    setForm({
      role: String(user.role || "user").toLowerCase(),
      is_active: user.is_active !== false,
    });
    setError("");
    setSuccess("");
  };

  const closeEdit = () => {
    if (saving) return;
    setSelectedUser(null);
  };

  const saveUser = async (event) => {
    event.preventDefault();

    if (!selectedUser) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const userId = selectedUser.id;

      await apiRequest(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: form.role,
          is_active: form.is_active,
        }),
      });

      setSuccess("User updated successfully.");
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to update user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-users">
      <header className="admin-users__header">
        <div>
          <span className="admin-users__eyebrow">HIMORA LIFESTYLE / ADMIN</span>
          <h1 className="admin-users__title">Customer Management</h1>
          <p className="admin-users__subtitle">
            Manage customer accounts, access roles, and account status.
          </p>
        </div>

        <button
          className="admin-users__primary-button"
          type="button"
          onClick={loadUsers}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "admin-users__spin" : ""} />
          Refresh Users
        </button>
      </header>

      {error && !selectedUser && (
        <div className="admin-users__alert admin-users__alert--error">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-users__alert admin-users__alert--success">
          <CheckCircle2 size={17} />
          <span>{success}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setSuccess("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="admin-users__stats">
        <article className="admin-users__stat-card">
          <div className="admin-users__stat-icon">
            <Users size={19} />
          </div>
          <div>
            <span className="admin-users__stat-label">Total Accounts</span>
            <strong className="admin-users__stat-value">
              {users.length}
            </strong>
          </div>
        </article>

        <article className="admin-users__stat-card">
          <div className="admin-users__stat-icon admin-users__stat-icon--gold">
            <ShieldCheck size={19} />
          </div>
          <div>
            <span className="admin-users__stat-label">Administrators</span>
            <strong className="admin-users__stat-value">{totalAdmins}</strong>
          </div>
        </article>

        <article className="admin-users__stat-card">
          <div className="admin-users__stat-icon admin-users__stat-icon--light">
            <UserRound size={19} />
          </div>
          <div>
            <span className="admin-users__stat-label">Active Accounts</span>
            <strong className="admin-users__stat-value">{activeUsers}</strong>
          </div>
        </article>
      </section>

      <section className="admin-users__content">
        <div className="admin-users__toolbar">
          <div className="admin-users__search-wrap">
            <Search size={17} className="admin-users__search-icon" />
            <input
              className="admin-users__search"
              type="search"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="admin-users__filter"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter users by role"
          >
            <option value="all">All Roles</option>
            <option value="user">Customers</option>
            <option value="admin">Administrators</option>
          </select>
        </div>

        <div className="admin-users__table-heading">
          <div>
            <h2>Registered Accounts</h2>
            <p>Review account details and manage access permissions.</p>
          </div>
          <span className="admin-users__result-count">
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "account" : "accounts"}
          </span>
        </div>

        <div className="admin-users__table-wrap">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="admin-users__actions-heading">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-users__empty">
                      <span className="admin-users__spinner" />
                      <p>Loading customer accounts...</p>
                    </div>
                  </td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-users__empty">
                      <div className="admin-users__empty-icon">
                        <Users size={22} />
                      </div>
                      <h3>No accounts found</h3>
                      <p>
                        Try another search term or change the selected filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => {
                  const name = user.full_name || user.name || "Unnamed User";
                  const role = String(user.role || "user").toLowerCase();
                  const isActive = user.is_active !== false;

                  return (
                    <tr key={user.id}>
                      <td data-label="Customer">
                        <div className="admin-users__customer">
                          <div
                            className={`admin-users__avatar ${
                              role === "admin"
                                ? "admin-users__avatar--admin"
                                : ""
                            }`}
                          >
                            {getInitials(name)}
                          </div>
                          <div className="admin-users__customer-info">
                            <span className="admin-users__customer-name">
                              {name}
                            </span>
                            <span className="admin-users__customer-id">
                              ID #{user.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td data-label="Contact">
                        <div className="admin-users__contact">
                          <span>{user.email || "No email provided"}</span>
                          {user.phone && <small>{user.phone}</small>}
                        </div>
                      </td>

                      <td data-label="Role">
                        <span
                          className={`admin-users__role ${
                            role === "admin"
                              ? "admin-users__role--admin"
                              : "admin-users__role--user"
                          }`}
                        >
                          {role === "admin" ? (
                            <ShieldCheck size={13} />
                          ) : (
                            <UserRound size={13} />
                          )}
                          {role === "admin" ? "Administrator" : "Customer"}
                        </span>
                      </td>

                      <td data-label="Status">
                        <span
                          className={`admin-users__status ${
                            isActive
                              ? "admin-users__status--active"
                              : "admin-users__status--inactive"
                          }`}
                        >
                          <span className="admin-users__status-dot" />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td data-label="Joined">
                        <span className="admin-users__date">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )
                            : "—"}
                        </span>
                      </td>

                      <td data-label="Actions">
                        <div className="admin-users__actions">
                          <button
                            type="button"
                            className="admin-users__edit-button"
                            onClick={() => openEdit(user)}
                            aria-label={`Edit ${name}`}
                          >
                            <Pencil size={14} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredUsers.length > 0 && (
          <footer className="admin-users__pagination">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredUsers.length)} of{" "}
              {filteredUsers.length}
            </span>

            <div className="admin-users__pagination-controls">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage((previous) => previous - 1)}
              >
                <ChevronLeft size={16} />
              </button>

              <span>
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((previous) => previous + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      {selectedUser && (
        <div
          className="admin-users__overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEdit();
          }}
        >
          <section
            className="admin-users__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-users-modal-title"
          >
            <header className="admin-users__modal-header">
              <div>
                <span className="admin-users__eyebrow">ACCOUNT SETTINGS</span>
                <h2
                  className="admin-users__modal-title"
                  id="admin-users-modal-title"
                >
                  Edit Customer
                </h2>
                <p className="admin-users__modal-description">
                  Update the role and access status for{" "}
                  <strong>
                    {selectedUser.full_name ||
                      selectedUser.name ||
                      selectedUser.email}
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                className="admin-users__close-button"
                onClick={closeEdit}
                disabled={saving}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            {error && (
              <div className="admin-users__modal-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form className="admin-users__form" onSubmit={saveUser}>
              <div className="admin-users__field">
                <label htmlFor="admin-users-role">Account Role</label>
                <select
                  id="admin-users-role"
                  value={form.role}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      role: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="user">Customer</option>
                  <option value="admin">Administrator</option>
                </select>
                <small>
                  Administrators can access protected management features.
                </small>
              </div>

              <div className="admin-users__field">
                <span className="admin-users__field-label">Account Status</span>
                <label className="admin-users__toggle-row">
                  <span className="admin-users__toggle-copy">
                    <strong>
                      {form.is_active ? "Account active" : "Account inactive"}
                    </strong>
                    <small>
                      {form.is_active
                        ? "This account is enabled."
                        : "This account is disabled."}
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        is_active: event.target.checked,
                      }))
                    }
                  />
                  <span className="admin-users__toggle-track" />
                </label>
              </div>

              <footer className="admin-users__modal-footer">
                <button
                  type="button"
                  className="admin-users__cancel-button"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-users__save-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="admin-users__spinner" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}