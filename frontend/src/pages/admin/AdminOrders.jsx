import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, RefreshCw, Search } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Admin authentication token not found.");
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load orders.");
      }

      setOrders(data);
      setFilteredOrders(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const searchValue = search.trim().toLowerCase();

    const filtered = orders.filter((order) => {
      const matchesSearch =
        !searchValue ||
        order.order_number?.toLowerCase().includes(searchValue) ||
        order.shipping_full_name?.toLowerCase().includes(searchValue) ||
        order.shipping_phone?.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    setFilteredOrders(filtered);
  }, [search, statusFilter, orders]);

  const formatCurrency = (amount) => {
    return `NPR ${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusClass = (status) => {
    return `admin-order-status admin-order-status-${status
      ?.toLowerCase()
      .replaceAll("_", "-")}`;
  };

  return (
    <div className="admin-orders-page">
      <div className="admin-orders-header">
        <div>
          <p className="admin-orders-eyebrow">HIMORA ADMINISTRATION</p>

          <h1>Orders</h1>

          <p className="admin-orders-description">
            Manage customer orders, fulfillment, payments, and delivery
            status.
          </p>
        </div>

        <button
          type="button"
          className="admin-orders-refresh"
          onClick={fetchOrders}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="admin-orders-toolbar">
        <div className="admin-orders-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search order, customer or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="admin-orders-status-filter"
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="OUT_FOR_DELIVERY">Out for delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="admin-orders-error">
          {error}
        </div>
      )}

      <div className="admin-orders-summary">
        <span>
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      <div className="admin-orders-table-wrapper">
        {loading ? (
          <div className="admin-orders-empty">
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-orders-empty">
            No orders found.
          </div>
        ) : (
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="admin-order-number">
                      {order.order_number}
                    </span>
                  </td>

                  <td>
                    <div className="admin-order-customer">
                      <strong>{order.shipping_full_name}</strong>
                      <span>{order.shipping_phone}</span>
                    </div>
                  </td>

                  <td>{formatDate(order.created_at)}</td>

                  <td>
                    <strong>{formatCurrency(order.total_amount)}</strong>
                  </td>

                  <td>
                    <div className="admin-order-payment">
                      <span>{order.payment_method}</span>
                      <small>{order.payment_status}</small>
                    </div>
                  </td>

                  <td>
                    <span className={getStatusClass(order.status)}>
                      {order.status?.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td>
                    <button
                        type="button"
                        className="admin-order-view"
                        title="View order"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                        <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminOrders;