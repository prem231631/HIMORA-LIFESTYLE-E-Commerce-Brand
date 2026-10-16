import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  FolderTree,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Users,
  AlertCircle,
} from "lucide-react";
import "./AdminDashboard.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function apiRequest(path) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

function getArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
}

function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getOrderTotal(order) {
  return Number(
    order.total_amount ??
      order.total ??
      order.grand_total ??
      order.amount ??
      0
  );
}

function getOrderStatus(order) {
  return String(order.status || order.order_status || "pending")
    .toLowerCase()
    .replaceAll("_", " ");
}

function getCustomerName(order) {
  return (
    order.customer_name ||
    order.user?.full_name ||
    order.user?.name ||
    order.shipping_address?.full_name ||
    order.shipping_address?.name ||
    order.customer?.full_name ||
    order.customer?.name ||
    order.user?.email ||
    "Customer"
  );
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const requests = [
      {
        name: "orders",
        path: "/api/admin/orders",
        keys: ["orders", "items", "results"],
      },
      {
        name: "products",
        path: "/api/products",
        keys: ["products", "items", "results"],
      },
      {
        name: "categories",
        path: "/api/categories",
        keys: ["categories", "items", "results"],
      },
      {
        name: "users",
        path: "/api/admin/users",
        keys: ["users", "items", "results"],
      },
      {
        name: "inventory",
        path: "/api/inventory/admin",
        keys: ["inventory", "items", "results"],
      },
    ];

    const results = await Promise.allSettled(
      requests.map((request) => apiRequest(request.path))
    );

    const loaded = {};
    const failures = [];

    results.forEach((result, index) => {
      const request = requests[index];

      if (result.status === "fulfilled") {
        loaded[request.name] = getArray(result.value, request.keys);
      } else {
        loaded[request.name] = [];
        failures.push(request.name);
      }
    });

    setOrders(loaded.orders || []);
    setProducts(loaded.products || []);
    setCategories(loaded.categories || []);
    setUsers(loaded.users || []);
    setInventory(loaded.inventory || []);
    setLastUpdated(new Date());

    if (failures.length === requests.length) {
      setError(
        "Dashboard data could not be loaded. Check your API connection and admin permissions."
      );
    } else if (failures.length > 0) {
      setError(
        `Some dashboard data could not be loaded: ${failures.join(", ")}. Verify the corresponding API endpoints.`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalRevenue = orders
    .filter((order) => {
      const status = getOrderStatus(order);
      return !["cancelled", "refunded", "failed"].includes(status);
    })
    .reduce((total, order) => total + getOrderTotal(order), 0);

  const pendingOrders = orders.filter((order) => {
    const status = getOrderStatus(order);
    return ["pending", "processing", "confirmed"].includes(status);
  }).length;

  const lowStockItems = inventory.filter((item) => {
    const available = Number(
      item.available_quantity ??
        item.stock_quantity ??
        item.quantity ??
        0
    );

    return available <= Number(item.low_stock_threshold ?? 5);
  });

  const recentOrders = [...orders]
    .sort((a, b) => {
      const dateA = new Date(
        a.created_at || a.order_date || a.updated_at || 0
      ).getTime();

      const dateB = new Date(
        b.created_at || b.order_date || b.updated_at || 0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 6);

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      description: "From recorded orders",
      icon: Activity,
      className: "admin-dashboard__stat-icon--gold",
      href: "/admin/orders",
    },
    {
      label: "Total Orders",
      value: orders.length.toLocaleString(),
      description: `${pendingOrders} pending or processing`,
      icon: ShoppingBag,
      className: "admin-dashboard__stat-icon--green",
      href: "/admin/orders",
    },
    {
      label: "Products",
      value: products.length.toLocaleString(),
      description: "Products in the catalogue",
      icon: Package,
      className: "admin-dashboard__stat-icon--neutral",
      href: "/admin/products",
    },
    {
      label: "Customers",
      value: users.length.toLocaleString(),
      description: "Registered accounts",
      icon: Users,
      className: "admin-dashboard__stat-icon--gold",
      href: "/admin/users",
    },
  ];

  const quickLinks = [
    {
      title: "Manage Products",
      description: "Update product details, prices, and availability.",
      icon: Package,
      href: "/admin/products",
    },
    {
      title: "Manage Categories",
      description: "Organize the storefront product catalogue.",
      icon: FolderTree,
      href: "/admin/categories",
    },
    {
      title: "Manage Inventory",
      description: "Review stock levels and inventory adjustments.",
      icon: Boxes,
      href: "/admin/inventory",
    },
    {
      title: "Manage Orders",
      description: "Review orders and update fulfilment status.",
      icon: ClipboardList,
      href: "/admin/orders",
    },
    {
      title: "Manage Customers",
      description: "Review customer accounts and account access.",
      icon: Users,
      href: "/admin/users",
    },
  ];

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <span className="admin-dashboard__eyebrow">
            HIMORA LIFESTYLE / ADMINISTRATION
          </span>
          <h1 className="admin-dashboard__title">Dashboard Overview</h1>
          <p className="admin-dashboard__subtitle">
            A clear overview of your store, orders, customers, and inventory.
          </p>
        </div>

        <button
          type="button"
          className="admin-dashboard__refresh"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={loading ? "admin-dashboard__spin" : ""}
          />
          Refresh Overview
        </button>
      </header>

      <section className="admin-dashboard__welcome">
        <div className="admin-dashboard__welcome-copy">
          <span className="admin-dashboard__welcome-label">
            STORE MANAGEMENT
          </span>
          <h2>Welcome to your control room.</h2>
          <p>
            Manage your luxury storefront with a unified view of its essential
            operations.
          </p>
        </div>

        <div className="admin-dashboard__welcome-mark" aria-hidden="true">
          <span>H</span>
          <i />
        </div>
      </section>

      {error && (
        <div className="admin-dashboard__alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      <section className="admin-dashboard__section">
        <div className="admin-dashboard__section-heading">
          <div>
            <span className="admin-dashboard__section-eyebrow">
              AT A GLANCE
            </span>
            <h2>Store Performance</h2>
          </div>

          {lastUpdated && (
            <span className="admin-dashboard__updated">
              Updated{" "}
              {lastUpdated.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <div className="admin-dashboard__stats">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                className="admin-dashboard__stat-card"
                key={stat.label}
                to={stat.href}
              >
                <div className="admin-dashboard__stat-top">
                  <span className="admin-dashboard__stat-label">
                    {stat.label}
                  </span>
                  <span
                    className={`admin-dashboard__stat-icon ${stat.className}`}
                  >
                    <Icon size={19} />
                  </span>
                </div>

                <strong className="admin-dashboard__stat-value">
                  {loading ? "—" : stat.value}
                </strong>

                <span className="admin-dashboard__stat-description">
                  {stat.description}
                </span>

                <span className="admin-dashboard__stat-link">
                  View details <ArrowRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="admin-dashboard__main-grid">
        <div className="admin-dashboard__panel admin-dashboard__orders-panel">
          <div className="admin-dashboard__panel-header">
            <div>
              <span className="admin-dashboard__section-eyebrow">
                LATEST ACTIVITY
              </span>
              <h2>Recent Orders</h2>
              <p>Your latest customer purchases.</p>
            </div>

            <Link
              to="/admin/orders"
              className="admin-dashboard__text-link"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="admin-dashboard__state">
              Loading recent orders...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="admin-dashboard__state">
              <div className="admin-dashboard__state-icon">
                <ShoppingBag size={22} />
              </div>
              <h3>No orders yet</h3>
              <p>New customer orders will appear here.</p>
            </div>
          ) : (
            <div className="admin-dashboard__orders">
              {recentOrders.map((order) => {
                const status = getOrderStatus(order);
                const isCompleted = [
                  "completed",
                  "delivered",
                  "paid",
                ].includes(status);
                const isCancelled = [
                  "cancelled",
                  "failed",
                  "refunded",
                ].includes(status);

                return (
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="admin-dashboard__order-row"
                    key={order.id}
                  >
                    <div className="admin-dashboard__order-icon">
                      <ShoppingBag size={16} />
                    </div>

                    <div className="admin-dashboard__order-info">
                      <strong>
                        Order #{order.order_number || order.id}
                      </strong>
                      <span>{getCustomerName(order)}</span>
                      <small>
                        {formatDate(
                          order.created_at ||
                            order.order_date ||
                            order.updated_at
                        )}
                      </small>
                    </div>

                    <div className="admin-dashboard__order-end">
                      <strong>{formatCurrency(getOrderTotal(order))}</strong>
                      <span
                        className={`admin-dashboard__status ${
                          isCompleted
                            ? "admin-dashboard__status--completed"
                            : isCancelled
                              ? "admin-dashboard__status--cancelled"
                              : "admin-dashboard__status--pending"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <aside className="admin-dashboard__side-column">
          <div className="admin-dashboard__panel admin-dashboard__inventory-panel">
            <div className="admin-dashboard__panel-header">
              <div>
                <span className="admin-dashboard__section-eyebrow">
                  STOCK CONTROL
                </span>
                <h2>Inventory Watch</h2>
              </div>

              <span className="admin-dashboard__inventory-icon">
                <Boxes size={18} />
              </span>
            </div>

            <div className="admin-dashboard__inventory-number">
              {loading ? "—" : lowStockItems.length}
            </div>

            <p className="admin-dashboard__inventory-description">
              Items at or below their configured stock threshold.
            </p>

            <div className="admin-dashboard__inventory-divider" />

            <div className="admin-dashboard__inventory-summary">
              <span>Tracked inventory records</span>
              <strong>{loading ? "—" : inventory.length}</strong>
            </div>

            <Link
              to="/admin/inventory"
              className="admin-dashboard__wide-link"
            >
              Review inventory <ArrowRight size={14} />
            </Link>
          </div>

          <div className="admin-dashboard__panel admin-dashboard__catalog-panel">
            <div className="admin-dashboard__panel-header">
              <div>
                <span className="admin-dashboard__section-eyebrow">
                  CATALOGUE
                </span>
                <h2>Catalogue Summary</h2>
              </div>
            </div>

            <div className="admin-dashboard__catalog-row">
              <span className="admin-dashboard__catalog-icon">
                <Package size={16} />
              </span>
              <span>Products</span>
              <strong>{loading ? "—" : products.length}</strong>
            </div>

            <div className="admin-dashboard__catalog-row">
              <span className="admin-dashboard__catalog-icon">
                <FolderTree size={16} />
              </span>
              <span>Categories</span>
              <strong>{loading ? "—" : categories.length}</strong>
            </div>

            <div className="admin-dashboard__catalog-row">
              <span className="admin-dashboard__catalog-icon">
                <Users size={16} />
              </span>
              <span>Customers</span>
              <strong>{loading ? "—" : users.length}</strong>
            </div>

            <Link
              to="/admin/products"
              className="admin-dashboard__wide-link"
            >
              Manage catalogue <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </section>

      <section className="admin-dashboard__section admin-dashboard__quick-section">
        <div className="admin-dashboard__section-heading">
          <div>
            <span className="admin-dashboard__section-eyebrow">
              QUICK ACCESS
            </span>
            <h2>Management Shortcuts</h2>
          </div>
        </div>

        <div className="admin-dashboard__quick-grid">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                to={item.href}
                className="admin-dashboard__quick-card"
                key={item.title}
              >
                <span className="admin-dashboard__quick-icon">
                  <Icon size={19} />
                </span>

                <span className="admin-dashboard__quick-copy">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>

                <ArrowRight
                  size={16}
                  className="admin-dashboard__quick-arrow"
                />
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="admin-dashboard__footer">
        <span className="admin-dashboard__footer-mark">H</span>
        <span>HIMORA LIFESTYLE</span>
        <i />
        <span>Administration</span>
        <span className="admin-dashboard__footer-spacer" />
        <span className="admin-dashboard__footer-security">
          <ShieldCheck size={14} />
          Secure management
        </span>
      </footer>
    </main>
  );
}