
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  X,
  Save,
  ImagePlus,
  Package,
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
  stock_quantity: "0",
  is_active: true,
  is_featured: false,
  is_new: false,
  is_limited: false,
};

function getToken() {
  return localStorage.getItem("access_token");
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).join(", ")
      : data.detail;

    throw new Error(detail || "The request failed.");
  }

  return data;
}

function imageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

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
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Please log in with your admin account.");
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`, { headers }),
        fetch(`${API_BASE_URL}/api/categories`, { headers }),
      ]);

      const [productsData, categoriesData] = await Promise.all([
        readResponse(productsResponse),
        readResponse(categoriesResponse),
      ]);

      // Fetch variant inventory for each product using the existing API.
      const productsWithStock = await Promise.all(
        (Array.isArray(productsData) ? productsData : []).map(
          async (product) => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/products/${product.id}/variants`,
                { headers }
              );

              if (!response.ok) {
                return { ...product, stock_quantity: null };
              }

              const variants = await response.json();

              const totalStock = Array.isArray(variants)
                ? variants.reduce(
                    (sum, variant) =>
                      sum + Number(variant.inventory?.stock_quantity || 0),
                    0
                  )
                : 0;

              return { ...product, stock_quantity: totalStock };
            } catch {
              return { ...product, stock_quantity: null };
            }
          }
        )
      );

      setProducts(productsWithStock);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.slug?.toLowerCase().includes(query);

      const categoryId = product.category?.id ?? product.category_id;

      const matchesCategory =
        categoryFilter === "ALL" ||
        String(categoryId) === categoryFilter;

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
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((previous) => ({ ...previous, name: value, slug }));
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

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setSelectedImage(null);
    setImagePreview("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setFormError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError("");
  };

  const openCreateForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedImage(null);
    setImagePreview("");
    setFormError("");
    setError("");
    setSuccess("");
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    if (saving) return;
    setShowCreateForm(false);
    setFormError("");
    setSelectedImage(null);
    setImagePreview("");
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    setFormError("");
    setError("");
    setSuccess("");

    const token = getToken();

    if (!token) {
      setFormError("Please log in with your admin account.");
      return;
    }

    const name = formData.name.trim();
    const slug = formData.slug.trim();
    const price = Number(formData.price);
    const stock = Number(formData.stock_quantity);

    if (name.length < 2) {
      setFormError("Product name must contain at least 2 characters.");
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setFormError("Enter a valid lowercase product slug.");
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

    if (!Number.isSafeInteger(stock) || stock < 0) {
      setFormError("Stock quantity must be a non-negative whole number.");
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
          stock_quantity: stock,
          is_active: formData.is_active,
          is_featured: formData.is_featured,
          is_new: formData.is_new,
          is_limited: formData.is_limited,
        }),
      });

      const product = await readResponse(response);

      if (selectedImage) {
        const uploadForm = new FormData();
        uploadForm.append("file", selectedImage);
        uploadForm.append("alt_text", name);

        const uploadResponse = await fetch(
          `${API_BASE_URL}/api/products/${product.id}/images/upload`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: uploadForm,
          }
        );

        try {
          await readResponse(uploadResponse);
        } catch (uploadError) {
          setSuccess(
            `Product created, but image upload failed: ${uploadError.message}. You can retry the image upload separately.`
          );
          setShowCreateForm(false);
          await fetchProducts();
          return;
        }
      }

      setSuccess(`"${product.name}" was created successfully.`);
      setShowCreateForm(false);
      setFormData(INITIAL_FORM_DATA);
      setSelectedImage(null);
      setImagePreview("");

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
          <p className="admin-products-eyebrow">HIMORA ADMINISTRATION</p>
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
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            type="button"
            className="admin-products-add"
            onClick={openCreateForm}
            disabled={saving}
          >
            <Plus size={16} /> Add Product
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
          className="admin-products-filter"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
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
          className="admin-products-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Published</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </section>

      {error && <div className="admin-products-error" role="alert">{error}</div>}
      {success && <div className="admin-products-success" role="status">{success}</div>}

      {showCreateForm && (
        <section className="admin-products-form-panel">
          <div className="admin-products-form-header">
            <div>
              <p className="admin-products-eyebrow">NEW COLLECTION PIECE</p>
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

          {formError && <div className="admin-products-error" role="alert">{formError}</div>}

          <form onSubmit={handleCreateProduct}>
            <div className="admin-products-form-grid">
              <label className="admin-products-field">
                Product name *
                <input
                  name="name"
                  value={formData.name}
                  onChange={(event) => handleProductNameChange(event.target.value)}
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
                    <option key={category.id} value={String(category.id)}>
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

              <label className="admin-products-field">
                Initial stock quantity *
                <input
                  name="stock_quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.stock_quantity}
                  onChange={handleFormChange}
                  required
                />
                <span className="admin-products-help">
                  Enter the number of units currently in stock.
                </span>
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

            <div className="admin-products-upload">
              <div>
                <p className="admin-products-upload-title">Product image</p>
                <p className="admin-products-help">
                  JPEG, PNG, or WebP · Maximum 5 MB
                </p>
              </div>

              <label className="admin-products-file-picker">
                <ImagePlus size={17} />
                Choose image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />
              </label>

              {imagePreview && (
                <div className="admin-products-image-preview">
                  <img src={imagePreview} alt="Selected product preview" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview("");
                    }}
                  >
                    <X size={14} /> Remove image
                  </button>
                </div>
              )}
            </div>

            <div className="admin-products-options">
              {[
                ["is_active", "Published"],
                ["is_featured", "Featured"],
                ["is_new", "New arrival"],
                ["is_limited", "Limited edition"],
              ].map(([name, label]) => (
                <label key={name}>
                  <input
                    type="checkbox"
                    name={name}
                    checked={formData[name]}
                    onChange={handleFormChange}
                  />
                  {label}
                </label>
              ))}
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
          {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
        </span>
        <span>{products.filter((product) => product.is_active).length} published</span>
      </section>

      <section className="admin-products-table-wrapper">
        {loading ? (
          <div className="admin-products-empty">Loading collection...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-products-empty">No products match your search.</div>
        ) : (
          <table className="admin-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Collection</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const primaryImage =
                  product.images?.find((image) => image.is_primary) ||
                  product.images?.[0];

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-products-product-cell">
                        {primaryImage ? (
                          <img
                            className="admin-products-thumbnail"
                            src={imageUrl(primaryImage.image_url)}
                            alt={primaryImage.alt_text || product.name}
                          />
                        ) : (
                          <div className="admin-products-thumbnail-placeholder">
                            <ImagePlus size={18} />
                          </div>
                        )}
                        <div className="admin-products-name">
                          <strong>{product.name}</strong>
                          <span>{product.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td>{product.category?.name || "Uncategorized"}</td>
                    <td className="admin-products-price">{formatCurrency(product.price)}</td>
                    <td>
                      <span className="admin-products-stock">
                        <Package size={14} />
                        {product.stock_quantity === null
                          ? "Unavailable"
                          : `${product.stock_quantity} units`}
                      </span>
                    </td>

                    <td>
                      <div className="admin-products-tags">
                        {product.is_featured && <span className="admin-products-tag">Featured</span>}
                        {product.is_new && <span className="admin-products-tag">New</span>}
                        {product.is_limited && <span className="admin-products-tag">Limited</span>}
                        {!product.is_featured && !product.is_new && !product.is_limited && "—"}
                      </div>
                    </td>

                    <td>
                      <span className={`admin-products-status ${product.is_active ? "is-active" : "is-inactive"}`}>
                        {product.is_active ? "Published" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default AdminProducts;
