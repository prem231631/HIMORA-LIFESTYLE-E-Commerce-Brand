import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Boxes,
  LoaderCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import "./AdminInventory.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken")
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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Request failed with status ${response.status}.`,
    );
  }

  return response.json();
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function getStockStatus(item) {
  if (!item.is_active) {
    return { label: "Inactive", className: "inactive" };
  }

  if (item.available_quantity <= 0) {
    return { label: "Out of stock", className: "out-of-stock" };
  }

  if (item.available_quantity <= 5) {
    return { label: "Low stock", className: "low-stock" };
  }

  return { label: "In stock", className: "in-stock" };
}

export default function AdminInventory() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [adjustments, setAdjustments] = useState({});

  const loadInventory = useCallback(async (isRefresh = false) => {
    setError("");

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({
        skip: "0",
        limit: "200",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (lowStockOnly) {
        params.set("low_stock", "true");
      }

      const data = await apiRequest(
        `/api/inventory/admin?${params.toString()}`,
      );

      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load inventory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, lowStockOnly]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const updateAdjustment = (inventoryId, field, value) => {
    setAdjustments((previous) => ({
      ...previous,
      [inventoryId]: {
        ...previous[inventoryId],
        [field]: value,
      },
    }));
  };

  const saveInventory = async (item) => {
    const adjustment = adjustments[item.id] || {};

    const stockQuantity =
      adjustment.stock_quantity === undefined ||
      adjustment.stock_quantity === ""
        ? item.stock_quantity
        : Number(adjustment.stock_quantity);

    const reservedQuantity =
      adjustment.reserved_quantity === undefined ||
      adjustment.reserved_quantity === ""
        ? item.reserved_quantity
        : Number(adjustment.reserved_quantity);

    const soldQuantity =
      adjustment.sold_quantity === undefined ||
      adjustment.sold_quantity === ""
        ? item.sold_quantity
        : Number(adjustment.sold_quantity);

    if (
      !Number.isInteger(stockQuantity) ||
      !Number.isInteger(reservedQuantity) ||
      !Number.isInteger(soldQuantity) ||
      stockQuantity < 0 ||
      reservedQuantity < 0 ||
      soldQuantity < 0
    ) {
      setError("Inventory quantities must be non-negative whole numbers.");
      return;
    }

    if (
      reservedQuantity > stockQuantity ||
      soldQuantity > stockQuantity
    ) {
      setError(
        "Reserved and sold quantities cannot exceed the total stock quantity.",
      );
      return;
    }

    setSavingId(item.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/inventory/admin/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          stock_quantity: stockQuantity,
          reserved_quantity: reservedQuantity,
          sold_quantity: soldQuantity,
        }),
      });

      setSuccess(`Inventory for ${item.product_name} was updated.`);
      setAdjustments((previous) => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });

      await loadInventory(true);
    } catch (err) {
      setError(err.message || "Unable to update inventory.");
    } finally {
      setSavingId(null);
    }
  };

  const adjustStock = async (item, direction) => {
    const adjustment = adjustments[item.id] || {};
    const quantity = Number(adjustment.adjustment_quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Enter a valid positive quantity to adjust stock.");
      return;
    }

    if (
      direction < 0 &&
      quantity > item.available_quantity
    ) {
      setError(
        `Only ${item.available_quantity} units are currently available.`,
      );
      return;
    }

    setSavingId(item.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `/api/inventory/admin/${item.id}/adjust?quantity_change=${direction * quantity}`,
        { method: "POST" },
      );

      setSuccess(
        `Stock for ${item.product_name} was ${direction > 0 ? "increased" : "decreased"}.`,
      );

      setAdjustments((previous) => ({
        ...previous,
        [item.id]: {
          ...previous[item.id],
          adjustment_quantity: "",
        },
      }));

      await loadInventory(true);
    } catch (err) {
      setError(err.message || "Unable to adjust stock.");
    } finally {
      setSavingId(null);
    }
  };

  const totalStock = inventory.reduce(
    (sum, item) => sum + item.stock_quantity,
    0,
  );

  const totalReserved = inventory.reduce(
    (sum, item) => sum + item.reserved_quantity,
    0,
  );

  const totalAvailable = inventory.reduce(
    (sum, item) => sum + item.available_quantity,
    0,
  );

  const lowStockCount = inventory.filter(
    (item) => item.available_quantity <= 5,
  ).length;

  return (
    <main className="admin-inventory">
      <header className="admin-inventory__header">
        <div>
          <span className="admin-inventory__eyebrow">
            HIMORA LIFESTYLE / ADMINISTRATION
          </span>

          <h1>Inventory Management</h1>

          <p>
            Monitor product stock, manage availability, and adjust inventory.
          </p>
        </div>

        <button
          type="button"
          className="admin-inventory__refresh"
          onClick={() => loadInventory(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? (
            <LoaderCircle size={17} className="admin-inventory__spin" />
          ) : (
            <RefreshCw size={17} />
          )}
          Refresh
        </button>
      </header>

      {error && (
        <div className="admin-inventory__alert admin-inventory__alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="admin-inventory__alert admin-inventory__alert--success">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>
            Dismiss
          </button>
        </div>
      )}

      <section className="admin-inventory__stats">
        <article className="admin-inventory__stat">
          <div className="admin-inventory__stat-icon">
            <Boxes size={20} />
          </div>
          <span>Total Stock</span>
          <strong>{formatNumber(totalStock)}</strong>
          <small>Units across displayed items</small>
        </article>

        <article className="admin-inventory__stat">
          <div className="admin-inventory__stat-icon">
            <SlidersHorizontal size={20} />
          </div>
          <span>Reserved Units</span>
          <strong>{formatNumber(totalReserved)}</strong>
          <small>Units currently reserved</small>
        </article>

        <article className="admin-inventory__stat">
          <div className="admin-inventory__stat-icon">
            <ArrowUp size={20} />
          </div>
          <span>Available Units</span>
          <strong>{formatNumber(totalAvailable)}</strong>
          <small>Stock minus reservations</small>
        </article>

        <article className="admin-inventory__stat">
          <div className="admin-inventory__stat-icon">
            <ArrowDown size={20} />
          </div>
          <span>Low Stock Items</span>
          <strong>{formatNumber(lowStockCount)}</strong>
          <small>Five or fewer available units</small>
        </article>
      </section>

      <section className="admin-inventory__panel">
        <div className="admin-inventory__toolbar">
          <div>
            <h2>Product Inventory</h2>
            <p>Review and update stock levels for each product variant.</p>
          </div>

          <label className="admin-inventory__search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search product, SKU, size..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="admin-inventory__filter">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => setLowStockOnly(event.target.checked)}
            />
            Low stock only
          </label>
        </div>

        {loading ? (
          <div className="admin-inventory__state">
            <LoaderCircle
              size={28}
              className="admin-inventory__spin"
            />
            <p>Loading inventory...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="admin-inventory__state">
            <Boxes size={34} />
            <h3>No inventory found</h3>
            <p>
              Try another search term or check whether product variants have
              inventory records.
            </p>
          </div>
        ) : (
          <div className="admin-inventory__table-wrap">
            <table className="admin-inventory__table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Status</th>
                  <th>Total Stock</th>
                  <th>Reserved</th>
                  <th>Sold</th>
                  <th>Available</th>
                  <th>Update Inventory</th>
                </tr>
              </thead>

              <tbody>
                {inventory.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const adjustment = adjustments[item.id] || {};
                  const isSaving = savingId === item.id;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-inventory__product">
                          <strong>{item.product_name}</strong>
                          <span>{item.sku}</span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-inventory__variant">
                          <span>
                            {item.size || "One size"}
                          </span>
                          <span>
                            {item.color || "Standard"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`admin-inventory__badge admin-inventory__badge--${stockStatus.className}`}
                        >
                          {stockStatus.label}
                        </span>
                      </td>

                      <td>
                        <input
                          className="admin-inventory__number-input"
                          aria-label={`Total stock for ${item.product_name}`}
                          type="number"
                          min="0"
                          step="1"
                          value={
                            adjustment.stock_quantity ??
                            item.stock_quantity
                          }
                          onChange={(event) =>
                            updateAdjustment(
                              item.id,
                              "stock_quantity",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </td>

                      <td>
                        <input
                          className="admin-inventory__number-input"
                          aria-label={`Reserved quantity for ${item.product_name}`}
                          type="number"
                          min="0"
                          step="1"
                          value={
                            adjustment.reserved_quantity ??
                            item.reserved_quantity
                          }
                          onChange={(event) =>
                            updateAdjustment(
                              item.id,
                              "reserved_quantity",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </td>

                      <td>
                        <input
                          className="admin-inventory__number-input"
                          aria-label={`Sold quantity for ${item.product_name}`}
                          type="number"
                          min="0"
                          step="1"
                          value={
                            adjustment.sold_quantity ??
                            item.sold_quantity
                          }
                          onChange={(event) =>
                            updateAdjustment(
                              item.id,
                              "sold_quantity",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </td>

                      <td>
                        <strong
                          className={
                            item.available_quantity <= 5
                              ? "admin-inventory__available--low"
                              : "admin-inventory__available"
                          }
                        >
                          {formatNumber(item.available_quantity)}
                        </strong>
                      </td>

                      <td>
                        <div className="admin-inventory__actions">
                          <button
                            type="button"
                            className="admin-inventory__save"
                            onClick={() => saveInventory(item)}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>

                          <div className="admin-inventory__adjust">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              aria-label={`Stock adjustment quantity for ${item.product_name}`}
                              placeholder="Qty"
                              value={adjustment.adjustment_quantity ?? ""}
                              onChange={(event) =>
                                updateAdjustment(
                                  item.id,
                                  "adjustment_quantity",
                                  event.target.value,
                                )
                              }
                              disabled={isSaving}
                            />

                            <button
                              type="button"
                              title="Increase stock"
                              aria-label={`Increase stock for ${item.product_name}`}
                              onClick={() => adjustStock(item, 1)}
                              disabled={isSaving}
                            >
                              <ArrowUp size={15} />
                            </button>

                            <button
                              type="button"
                              title="Decrease stock"
                              aria-label={`Decrease stock for ${item.product_name}`}
                              onClick={() => adjustStock(item, -1)}
                              disabled={
                                isSaving ||
                                item.available_quantity <= 0
                              }
                            >
                              <ArrowDown size={15} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="admin-inventory__footer">
          <span>
            Showing {formatNumber(inventory.length)} inventory records
          </span>
          <span>HIMORA LIFESTYLE · Inventory</span>
        </footer>
      </section>
    </main>
  );
}