import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  Eye,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import "./AdminOrders.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

function getToken() {
  return localStorage.getItem("access_token");
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.detail || data.message || "Unable to complete the request."
        : data || "Unable to complete the request.";

    throw new Error(
      typeof message === "string" ? message : "Unable to complete the request."
    );
  }

  return data;
}

function formatCurrency(amount) {
  return `NPR ${Number(amount || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeStatus(status) {
  return String(status || "PENDING").toUpperCase();
}

function formatStatus(status) {
  return normalizeStatus(status).replaceAll("_", " ");
}

function getStatusClass(status) {
  return `admin-order-status admin-order-status-${normalizeStatus(status)
    .toLowerCase()
    .replaceAll("_", "-")}`;
}

function getCustomerName(order) {
  return (
    order.shipping_full_name ||
    order.customer_name ||
    order.user?.full_name ||
    order.user?.name ||
    order.shipping_address?.full_name ||
    "Guest customer"
  );
}

function getCustomerPhone(order) {
  return (
    order.shipping_phone ||
    order.customer_phone ||
    order.user?.phone ||
    order.shipping_address?.phone ||
    ""
  );
}

function getPaymentMethod(order) {
  return (
    order.payment_method ||
    order.payment?.payment_method ||
    order.payment?.method ||
    "—"
  );
}

function getPaymentStatus(order) {
  return (
    order.payment_status ||
    order.payment?.status ||
    order.payment?.payment_status ||
    "—"
  );
}

function getOrderTotal(order) {
  return order.total_amount ?? order.total ?? order.grand_total ?? 0;
}

function getOrderNumber(order) {
  return order.order_number || `ORD-${String(order.id).padStart(5, "0")}`;
}

function AdminOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/admin/all`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readResponse(response);

      const normalizedOrders = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.orders)
            ? data.orders
            : [];

      setOrders(normalizedOrders);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();

    const filtered = orders.filter((order) => {
      const orderNumber = getOrderNumber(order).toLowerCase();
      const customerName = getCustomerName(order).toLowerCase();
      const phone = getCustomerPhone(order).toLowerCase();
      const email = String(
        order.user?.email || order.customer_email || order.shipping_email || ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        orderNumber.includes(query) ||
        customerName.includes(query) ||
        phone.includes(query) ||
        email.includes(query) ||
        String(order.id).includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        normalizeStatus(order.status) === statusFilter;

      const paymentStatus = String(getPaymentStatus(order)).toUpperCase();

      const matchesPayment =
        paymentFilter === "ALL" ||
        paymentStatus === paymentFilter ||
        (paymentFilter === "UNPAID" &&
          ["PENDING", "UNPAID", "FAILED"].includes(paymentStatus));

      const createdAt = order.created_at ? new Date(order.created_at) : null;
      let matchesDate = true;

      if (!createdAt || Number.isNaN(createdAt.getTime())) {
        matchesDate = dateFilter === "ALL";
      } else if (dateFilter === "TODAY") {
        matchesDate = createdAt.toDateString() === now.toDateString();
      } else if (dateFilter === "7_DAYS") {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        matchesDate = createdAt >= sevenDaysAgo && createdAt <= now;
      } else if (dateFilter === "30_DAYS") {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        matchesDate = createdAt >= thirtyDaysAgo && createdAt <= now;
      }

      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      if (sortOrder === "OLDEST") return dateA - dateB;
      if (sortOrder === "HIGHEST") {
        return Number(getOrderTotal(b)) - Number(getOrderTotal(a));
      }
      if (sortOrder === "LOWEST") {
        return Number(getOrderTotal(a)) - Number(getOrderTotal(b));
      }

      return dateB - dateA;
    });
  }, [
    orders,
    search,
    statusFilter,
    paymentFilter,
    dateFilter,
    sortOrder,
  ]);

  const summary = useMemo(() => {
    const totalRevenue = orders.reduce((total, order) => {
      const status = normalizeStatus(order.status);

      if (status === "CANCELLED") return total;

      return total + Number(getOrderTotal(order) || 0);
    }, 0);

    const pendingCount = orders.filter((order) =>
      ["PENDING", "CONFIRMED", "PROCESSING"].includes(
        normalizeStatus(order.status)
      )
    ).length;

    const deliveredCount = orders.filter(
      (order) => normalizeStatus(order.status) === "DELIVERED"
    ).length;

    return {
      total: orders.length,
      pending: pendingCount,
      delivered: deliveredCount,
      revenue: totalRevenue,
    };
  }, [orders]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
    setDateFilter("ALL");
    setSortOrder("NEWEST");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    paymentFilter !== "ALL" ||
    dateFilter !== "ALL" ||
    sortOrder !== "NEWEST";

  return (
    <main className="admin-orders-page">
      <header className="admin-orders-header">
        <div className="admin-orders-heading">
          <p className="admin-orders-eyebrow">HIMORA ADMINISTRATION</p>
          <h1>Orders</h1>
          <p className="admin-orders-description">
            Manage customer orders, review payments, and oversee fulfillment
            from one place.
          </p>
        </div>

        <div className="admin-orders-header-actions">
          {lastUpdated && (
            <span className="admin-orders-last-updated">
              Updated {lastUpdated.toLocaleTimeString("en-NP", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}

          <button
            type="button"
            className="admin-orders-refresh"
            onClick={fetchOrders}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "admin-orders-spinning" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      <section className="admin-orders-stats" aria-label="Order statistics">
        <article className="admin-orders-stat-card">
          <div className="admin-orders-stat-top">
            <span className="admin-orders-stat-label">Total Orders</span>
            <span className="admin-orders-stat-icon">
              <ShoppingBag size={18} />
            </span>
          </div>
          <strong className="admin-orders-stat-value">{summary.total}</strong>
          <span className="admin-orders-stat-caption">
            Orders recorded in the system
          </span>
        </article>

        <article className="admin-orders-stat-card">
          <div className="admin-orders-stat-top">
            <span className="admin-orders-stat-label">Awaiting Fulfillment</span>
            <span className="admin-orders-stat-icon admin-orders-stat-icon-gold">
              <Package size={18} />
            </span>
          </div>
          <strong className="admin-orders-stat-value">{summary.pending}</strong>
          <span className="admin-orders-stat-caption">
            Pending, confirmed, or processing
          </span>
        </article>

        <article className="admin-orders-stat-card">
          <div className="admin-orders-stat-top">
            <span className="admin-orders-stat-label">Delivered</span>
            <span className="admin-orders-stat-icon admin-orders-stat-icon-green">
              <Package size={18} />
            </span>
          </div>
          <strong className="admin-orders-stat-value">
            {summary.delivered}
          </strong>
          <span className="admin-orders-stat-caption">
            Successfully delivered orders
          </span>
        </article>

        <article className="admin-orders-stat-card">
          <div className="admin-orders-stat-top">
            <span className="admin-orders-stat-label">Order Value</span>
            <span className="admin-orders-stat-icon admin-orders-stat-icon-blue">
              <ArrowDownUp size={18} />
            </span>
          </div>
          <strong className="admin-orders-stat-value admin-orders-stat-value-money">
            {formatCurrency(summary.revenue)}
          </strong>
          <span className="admin-orders-stat-caption">
            Excludes cancelled orders
          </span>
        </article>
      </section>

      <section className="admin-orders-panel">
        <div className="admin-orders-panel-header">
          <div>
            <h2>All Orders</h2>
            <p>Search, filter, and open an order to manage its details.</p>
          </div>

          <span className="admin-orders-count">
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "order" : "orders"}
          </span>
        </div>

        <div className="admin-orders-toolbar">
          <label className="admin-orders-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search order, customer, email, or phone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search orders"
            />

            {search && (
              <button
                type="button"
                className="admin-orders-clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="admin-orders-filter"
            aria-label="Filter by order status"
          >
            <option value="ALL">All order statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className="admin-orders-filter"
            aria-label="Filter by payment status"
          >
            <option value="ALL">All payments</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Payment pending</option>
            <option value="UNPAID">Unpaid / failed</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="admin-orders-filter"
            aria-label="Filter by order date"
          >
            <option value="ALL">All dates</option>
            <option value="TODAY">Today</option>
            <option value="7_DAYS">Last 7 days</option>
            <option value="30_DAYS">Last 30 days</option>
          </select>

          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="admin-orders-filter admin-orders-sort"
            aria-label="Sort orders"
          >
            <option value="NEWEST">Newest first</option>
            <option value="OLDEST">Oldest first</option>
            <option value="HIGHEST">Highest value</option>
            <option value="LOWEST">Lowest value</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="admin-orders-clear-filters"
              onClick={clearFilters}
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="admin-orders-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="admin-orders-error-retry"
            >
              Retry
            </button>
          </div>
        )}

        <div className="admin-orders-table-wrapper">
          {loading ? (
            <div className="admin-orders-empty">
              <RefreshCw
                size={24}
                className="admin-orders-loading-icon admin-orders-spinning"
              />
              <strong>Loading orders</strong>
              <span>Retrieving the latest order information...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-orders-empty">
              <ShoppingBag
                size={28}
                className="admin-orders-empty-icon"
              />
              <strong>
                {orders.length === 0 ? "No orders yet" : "No matching orders"}
              </strong>
              <span>
                {orders.length === 0
                  ? "Customer orders will appear here when they are placed."
                  : "Try adjusting your search or filters."}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="admin-orders-empty-action"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>
                    <span className="admin-orders-th-icon">
                      <CalendarDays size={13} />
                      Date
                    </span>
                  </th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const customerName = getCustomerName(order);
                  const customerPhone = getCustomerPhone(order);
                  const paymentStatus = getPaymentStatus(order);
                  const orderStatus = normalizeStatus(order.status);

                  return (
                    <tr key={order.id}>
                      <td>
                        <div className="admin-order-identifier">
                          <span className="admin-order-number">
                            {getOrderNumber(order)}
                          </span>
                          <span className="admin-order-id">
                            ID: {order.id}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-order-customer">
                          <span className="admin-order-avatar">
                            {customerName.charAt(0).toUpperCase()}
                          </span>
                          <span className="admin-order-customer-details">
                            <strong>{customerName}</strong>
                            <span>
                              {customerPhone ||
                                order.user?.email ||
                                order.customer_email ||
                                "Contact not available"}
                            </span>
                          </span>
                        </div>
                      </td>

                      <td>{formatDate(order.created_at)}</td>

                      <td>
                        <strong className="admin-order-total">
                          {formatCurrency(getOrderTotal(order))}
                        </strong>
                      </td>

                      <td>
                        <div className="admin-order-payment">
                          <span>{getPaymentMethod(order)}</span>
                          <span
                            className={`admin-order-payment-status admin-order-payment-status-${String(
                              paymentStatus
                            )
                              .toLowerCase()
                              .replaceAll("_", "-")
                              .replaceAll(" ", "-")}`}
                          >
                            {formatStatus(paymentStatus)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className={getStatusClass(orderStatus)}>
                          <span className="admin-order-status-dot" />
                          {formatStatus(orderStatus)}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="admin-order-view"
                          title={`View order ${getOrderNumber(order)}`}
                          aria-label={`View order ${getOrderNumber(order)}`}
                          onClick={() =>
                            navigate(`/admin/orders/${order.id}`)
                          }
                        >
                          <Eye size={17} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredOrders.length > 0 && (
          <footer className="admin-orders-table-footer">
            <span>
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
            <span>HIMORA LIFESTYLE · Order Management</span>
          </footer>
        )}
      </section>
    </main>
  );
}

export default AdminOrders;