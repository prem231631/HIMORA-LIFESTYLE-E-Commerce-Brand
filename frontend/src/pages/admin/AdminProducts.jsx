import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import "./AdminProducts.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Admin authentication token not found. Please log in.");
      }

      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE_URL}/api/categories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const productsData = await productsResponse.json();
      const categoriesData = await categoriesResponse.json();

      if (!productsResponse.ok) {
        throw new Error(
          productsData.detail || "Failed to load products."
        );
      }

      if (!categoriesResponse.ok) {
        throw new Error(
          categoriesData.detail || "Failed to load categories."
        );
      }

      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !searchValue ||
        product.name?.toLowerCase().includes(searchValue) ||
        product.slug?.toLowerCase().includes(searchValue);

      const matchesCategory =
        categoryFilter === "ALL" ||
        String(product.category?.id ?? product.category_id) ===
          categoryFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && product.is_active) ||
        (statusFilter === "INACTIVE" && !product.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const formatCurrency = (amount) =>
    `NPR ${Number(amount || 0).toLocaleString("en-NP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <main className="admin-products-page">
      <header className="admin-products-header">
        <div>
          <p className="admin-products-eyebrow">
            HIMORA ADMINISTRATION
          </p>

          <h1>Products</h1>

          <p className="admin-products-description">
            Curate the collection, manage product details, and control
            which pieces are available to customers.
          </p>
        </div>

        <div className="admin-products-header-actions">
          <button
            type="button"
            className="admin-products-refresh"
            onClick={fetchProducts}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            type="button"
            className="admin-products-add"
            onClick={() =>
              setError("The product creation form is coming in the next step.")
            }
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </header>

      <section className="admin-products-toolbar">
        <label className="admin-products-search">
          <Search size={17} />

          <input
            type="search"
            placeholder="Search products by name or slug..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="admin-products-filter"
        >
          <option value="ALL">All categories</option>

          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by publication status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="admin-products-filter"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Published</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </section>

      {error && (
        <div className="admin-products-error" role="alert">
          {error}
        </div>
      )}

      <section className="admin-products-summary">
        <span>
          {filteredProducts.length}{" "}
          {filteredProducts.length === 1 ? "product" : "products"}
        </span>

        <span>
          {products.filter((product) => product.is_active).length} published
        </span>
      </section>

      <section className="admin-products-table-wrapper">
        {loading ? (
          <div className="admin-products-empty">
            Loading collection...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-products-empty">
            No products match your search.
          </div>
        ) : (
          <table className="admin-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Collection</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="admin-products-name">
                      <strong>{product.name}</strong>
                      <span>{product.slug}</span>
                    </div>
                  </td>

                  <td>{product.category?.name || "Uncategorized"}</td>

                  <td className="admin-products-price">
                    {formatCurrency(product.price)}
                  </td>

                  <td>
                    <div className="admin-products-tags">
                      {product.is_featured && (
                        <span className="admin-products-tag">Featured</span>
                      )}

                      {product.is_new && (
                        <span className="admin-products-tag">New</span>
                      )}

                      {product.is_limited && (
                        <span className="admin-products-tag">Limited</span>
                      )}

                      {!product.is_featured &&
                        !product.is_new &&
                        !product.is_limited && <span>—</span>}
                    </div>
                  </td>

                  <td>
                    <span
                      className={`admin-products-status ${
                        product.is_active ? "is-active" : "is-inactive"
                      }`}
                    >
                      {product.is_active ? "Published" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default AdminProducts;