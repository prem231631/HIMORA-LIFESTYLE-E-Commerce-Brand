import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  X,
  Save,
} from "lucide-react";
import "./AdminProducts.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const INITIAL_FORM_DATA = {
  name: "",
  slug: "",
  category_id: "",
  description: "",
  price: "",
  is_active: true,
  is_featured: false,
  is_new: false,
  is_limited: false,
};

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error(
          "Admin authentication token not found. Please log in."
        );
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

      const productCategoryId =
        product.category?.id ?? product.category_id;

      const matchesCategory =
        categoryFilter === "ALL" ||
        String(productCategoryId) === categoryFilter;

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

  const handleProductNameChange = (value) => {
    const generatedSlug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((previous) => ({
      ...previous,
      name: value,
      slug: generatedSlug,
    }));

    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setFormError("");
  };

  const openCreateForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setFormError("");
    setError("");
    setSuccess("");
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    if (saving) return;

    setShowCreateForm(false);
    setFormError("");
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();

    setFormError("");
    setError("");
    setSuccess("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setFormError(
        "Admin authentication token not found. Please log in again."
      );
      return;
    }

    const name = formData.name.trim();
    const slug = formData.slug.trim();
    const price = Number(formData.price);

    if (name.length < 2) {
      setFormError("Product name must contain at least 2 characters.");
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setFormError(
        "Use a valid slug containing lowercase letters, numbers, and single hyphens."
      );
      return;
    }

    if (!formData.category_id) {
      setFormError("Please select a category.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Enter a valid price greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          slug,
          category_id: Number(formData.category_id),
          description: formData.description.trim() || null,
          price,
          is_active: formData.is_active,
          is_featured: formData.is_featured,
          is_new: formData.is_new,
          is_limited: formData.is_limited,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail;

        throw new Error(detail || "Failed to create product.");
      }

      setSuccess(`"${data.name}" was created successfully.`);
      setShowCreateForm(false);
      setFormData(INITIAL_FORM_DATA);

      await fetchProducts();
    } catch (err) {
      setFormError(err.message || "Unable to create product.");
    } finally {
      setSaving(false);
    }
  };

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
            disabled={loading || saving}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            type="button"
            className="admin-products-add"
            onClick={openCreateForm}
            disabled={saving}
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

      {success && (
        <div className="admin-products-success" role="status">
          {success}
        </div>
      )}

      {showCreateForm && (
        <section className="admin-products-form-panel">
          <div className="admin-products-form-header">
            <div>
              <p className="admin-products-eyebrow">
                NEW COLLECTION PIECE
              </p>

              <h2>Add Product</h2>
            </div>

            <button
              type="button"
              className="admin-products-close"
              onClick={closeCreateForm}
              disabled={saving}
              aria-label="Close product form"
            >
              <X size={18} />
            </button>
          </div>

          {formError && (
            <div className="admin-products-error" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateProduct}>
            <div className="admin-products-form-grid">
              <label className="admin-products-field">
                Product name *
                <input
                  name="name"
                  value={formData.name}
                  onChange={(event) =>
                    handleProductNameChange(event.target.value)
                  }
                  placeholder="e.g. Himora Horizon"
                  minLength={2}
                  maxLength={255}
                  required
                />
              </label>

              <label className="admin-products-field">
                URL slug *
                <input
                  name="slug"
                  value={formData.slug}
                  onChange={handleFormChange}
                  placeholder="himora-horizon"
                  minLength={2}
                  maxLength={255}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Use lowercase letters, numbers, and hyphens."
                  required
                />
              </label>

              <label className="admin-products-field">
                Category *
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select category</option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={String(category.id)}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-products-field">
                Price (NPR) *
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.price}
                  onChange={handleFormChange}
                  placeholder="18500.00"
                  required
                />
              </label>

              <label className="admin-products-field admin-products-field-full">
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Describe the inspiration, craftsmanship, and details..."
                  rows={4}
                />
              </label>
            </div>

            <div className="admin-products-options">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleFormChange}
                />
                Published
              </label>

              <label>
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleFormChange}
                />
                Featured
              </label>

              <label>
                <input
                  type="checkbox"
                  name="is_new"
                  checked={formData.is_new}
                  onChange={handleFormChange}
                />
                New arrival
              </label>

              <label>
                <input
                  type="checkbox"
                  name="is_limited"
                  checked={formData.is_limited}
                  onChange={handleFormChange}
                />
                Limited edition
              </label>
            </div>

            <div className="admin-products-form-actions">
              <button
                type="button"
                className="admin-products-cancel"
                onClick={closeCreateForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-products-add"
                disabled={saving}
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </section>
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
                        <span className="admin-products-tag">
                          Featured
                        </span>
                      )}

                      {product.is_new && (
                        <span className="admin-products-tag">New</span>
                      )}

                      {product.is_limited && (
                        <span className="admin-products-tag">
                          Limited
                        </span>
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