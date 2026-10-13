import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Layers3,
  LoaderCircle,
  Package,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import "./AdminDashboard.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusClass(value) {
  const normalized = String(value || "").toLowerCase().replaceAll("_", "-");

  if (["delivered", "paid", "active", "confirmed"].includes(normalized)) {
    return "success";
  }

  if (["pending", "processing", "out-for-delivery"].includes(normalized)) {
    return "warning";
  }

  if (["cancelled", "failed", "inactive", "refunded"].includes(normalized)) {
    return "danger";
  }

  if (["shipped"].includes(normalized)) {
    return "info";
  }

  return "neutral";
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  loading,
}) {
  return (
    <article className={`admin-stat-card accent-${accent}`}>
      <div className="admin-stat-top">
        <span className="admin-stat-label">{title}</span>
        <span className="admin-stat-icon">
          <Icon size={20} strokeWidth={1.7} />
        </span>
      </div>

      <div className="admin-stat-value">
        {loading ? (
          <LoaderCircle className="admin-inline-loader" size={22} />
        ) : (
          value
        )}
      </div>

      <div className="admin-stat-description">{description}</div>
    </article>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    const token = getAuthToken();

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      if (response.status === 403) {
        setError("You do not have permission to access the admin dashboard.");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "Unable to load dashboard data.");
      }

      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(dashboard?.total_revenue),
      description: "Revenue from delivered orders",
      icon: CircleDollarSign,
      accent: "gold",
    },
    {
      title: "Total Orders",
      value: dashboard?.total_orders ?? 0,
      description: "All customer orders",
      icon: ShoppingCart,
      accent: "blue",
    },
    {
      title: "Products",
      value: dashboard?.total_products ?? 0,
      description: `${dashboard?.active_products ?? 0} active products`,
      icon: Package,
      accent: "purple",
    },
    {
      title: "Customers",
      value: dashboard?.total_users ?? 0,
      description: `${dashboard?.active_users ?? 0} active accounts`,
      icon: Users,
      accent: "green",
    },
  ];

  const quickLinks = [
    {
      title: "Manage Products",
      description: "Create, edit and organize products.",
      icon: Package,
      path: "/admin/products",
    },
    {
      title: "Manage Categories",
      description: "Organize your product collections.",
      icon: Layers3,
      path: "/admin/categories",
    },
    {
      title: "Manage Orders",
      description: "Review orders and update their status.",
      icon: ShoppingBag,
      path: "/admin/orders",
    },
    {
      title: "Manage Inventory",
      description: "Review stock and low-stock items.",
      icon: Boxes,
      path: "/admin/inventory",
    },
    {
      title: "Manage Customers",
      description: "View customers and account status.",
      icon: Users,
      path: "/admin/users",
    },
    {
      title: "Manage Payments",
      description: "Review payment records and statuses.",
      icon: CircleDollarSign,
      path: "/admin/payments",
    },
  ];

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <div className="admin-eyebrow">
            <ShieldCheck size={14} />
            HIMORA LIFESTYLE
          </div>

          <h1>Dashboard</h1>

          <p>
            An overview of your store, orders, customers and inventory.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={() => fetchDashboard(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "admin-spin" : ""}
          />
          Refresh
        </button>
      </header>

      {error && (
        <section className="admin-error-panel" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Dashboard unavailable</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            className="admin-retry-button"
          >
            Retry
          </button>
        </section>
      )}

      <section className="admin-welcome-panel">
        <div className="admin-welcome-content">
          <span className="admin-welcome-label">STORE OVERVIEW</span>
          <h2>Welcome to your command center.</h2>
          <p>
            Monitor store performance and manage your luxury shopping
            experience from one place.
          </p>
        </div>

        <div className="admin-welcome-mark" aria-hidden="true">
          <span>H</span>
          <span className="admin-welcome-mark-line" />
          <small>HIMORA</small>
        </div>
      </section>

      <section className="admin-stats-grid" aria-label="Store statistics">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
            loading={loading && !dashboard}
          />
        ))}
      </section>

      <section className="admin-dashboard-columns">
        <div className="admin-panel admin-orders-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">LATEST ACTIVITY</span>
              <h2>Recent Orders</h2>
            </div>

            <button
              type="button"
              className="admin-text-link"
              onClick={() => navigate("/admin/orders")}
            >
              View all <ArrowRight size={15} />
            </button>
          </div>

          <div className="admin-order-summary">
            <div>
              <span className="admin-summary-icon pending">
                <Clock3 size={17} />
              </span>
              <div>
                <span>Pending</span>
                <strong>{dashboard?.pending_orders ?? 0}</strong>
              </div>
            </div>

            <div>
              <span className="admin-summary-icon delivered">
                <CheckCircle2 size={17} />
              </span>
              <div>
                <span>Delivered</span>
                <strong>{dashboard?.delivered_orders ?? 0}</strong>
              </div>
            </div>

            <div>
              <span className="admin-summary-icon cancelled">
                <XCircle size={17} />
              </span>
              <div>
                <span>Cancelled</span>
                <strong>{dashboard?.cancelled_orders ?? 0}</strong>
              </div>
            </div>
          </div>

          {loading && !dashboard ? (
            <div className="admin-loading-state">
              <LoaderCircle className="admin-spin" size={24} />
              <span>Loading recent orders...</span>
            </div>
          ) : dashboard?.recent_orders?.length ? (
            <div className="admin-orders-list">
              {dashboard.recent_orders.map((order, index) => (
                <button
                  type="button"
                  className="admin-order-row"
                  key={order.id ?? order.order_number ?? index}
                  onClick={() => navigate("/admin/orders")}
                >
                  <span className="admin-order-avatar">
                    <ShoppingBag size={17} />
                  </span>

                  <span className="admin-order-main">
                    <strong>
                      {order.order_number || `Order #${order.id}`}
                    </strong>
                    <small>
                      {order.customer_name || order.shipping_full_name || "Customer"}
                      {" · "}
                      {formatDate(order.created_at)}
                    </small>
                  </span>

                  <span className="admin-order-end">
                    <strong>
                      {formatCurrency(order.total_amount)}
                    </strong>
                    <span
                      className={`admin-status-pill ${getStatusClass(order.status)}`}
                    >
                      {String(order.status || "Unknown").replaceAll("_", " ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <ShoppingBag size={28} />
              <strong>No orders yet</strong>
              <span>New customer orders will appear here.</span>
            </div>
          )}
        </div>

        <div className="admin-panel admin-performance-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">STORE HEALTH</span>
              <h2>Performance Snapshot</h2>
            </div>
            <Activity size={19} className="admin-panel-header-icon" />
          </div>

          <div className="admin-performance-list">
            <div className="admin-performance-item">
              <div className="admin-performance-label">
                <span>Active products</span>
                <strong>
                  {dashboard?.total_products
                    ? Math.round(
                        ((dashboard.active_products || 0) /
                          dashboard.total_products) *
                          100
                      )
                    : 0}
                  %
                </strong>
              </div>
              <div className="admin-progress-track">
                <span
                  className="admin-progress-fill gold"
                  style={{
                    width: `${
                      dashboard?.total_products
                        ? Math.min(
                            100,
                            ((dashboard.active_products || 0) /
                              dashboard.total_products) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="admin-performance-item">
              <div className="admin-performance-label">
                <span>Active customers</span>
                <strong>
                  {dashboard?.total_users
                    ? Math.round(
                        ((dashboard.active_users || 0) /
                          dashboard.total_users) *
                          100
                      )
                    : 0}
                  %
                </strong>
              </div>
              <div className="admin-progress-track">
                <span
                  className="admin-progress-fill green"
                  style={{
                    width: `${
                      dashboard?.total_users
                        ? Math.min(
                            100,
                            ((dashboard.active_users || 0) /
                              dashboard.total_users) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="admin-performance-item">
              <div className="admin-performance-label">
                <span>Low-stock records</span>
                <strong className="admin-low-stock-count">
                  {dashboard?.low_stock_records ?? 0}
                </strong>
              </div>

              <p className="admin-performance-note">
                {(dashboard?.low_stock_records ?? 0) > 0 ? (
                  <>
                    <AlertTriangle size={14} />
                    Some items need stock replenishment.
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    No low-stock records reported.
                  </>
                )}
              </p>
            </div>

            <div className="admin-performance-item">
              <div className="admin-performance-label">
                <span>Inventory records</span>
                <strong>{dashboard?.total_inventory_records ?? 0}</strong>
              </div>
              <p className="admin-performance-note">
                Stock records across product variants.
              </p>
            </div>

            <div className="admin-performance-item admin-revenue-note">
              <span className="admin-revenue-icon">
                <CircleDollarSign size={18} />
              </span>
              <div>
                <strong>Delivered-order revenue</strong>
                <span>{formatCurrency(dashboard?.total_revenue)}</span>
              </div>
              {Number(dashboard?.total_revenue || 0) > 0 ? (
                <ArrowUpRight size={17} className="admin-revenue-trend" />
              ) : (
                <ArrowDownRight size={17} className="admin-revenue-trend" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-panel admin-quick-actions">
        <div className="admin-panel-header">
          <div>
            <span className="admin-section-kicker">STORE MANAGEMENT</span>
            <h2>Quick Actions</h2>
          </div>
          <span className="admin-quick-actions-count">
            {quickLinks.length} sections
          </span>
        </div>

        <div className="admin-quick-links-grid">
          {quickLinks.map(({ title, description, icon: Icon, path }) => (
            <button
              type="button"
              className="admin-quick-link"
              key={path}
              onClick={() => navigate(path)}
            >
              <span className="admin-quick-link-icon">
                <Icon size={19} strokeWidth={1.7} />
              </span>

              <span className="admin-quick-link-text">
                <strong>{title}</strong>
                <small>{description}</small>
              </span>

              <ArrowRight
                size={16}
                className="admin-quick-link-arrow"
              />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;