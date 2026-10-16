import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ImagePlus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Save,
  X,
  Trash2,
} from "lucide-react";
import "./AdminProducts.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "")
).replace(/\/+$/, "");

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

function createEmptyVariant() {
  return {
    key: `${Date.now()}-${Math.random()}`,
    color: "",
    size: "",
    sku: "",
    stock_quantity: "0",
  };
}

function getToken() {
  return localStorage.getItem("access_token");
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).filter(Boolean).join(", ")
      : data.detail;

    throw new Error(detail || `Request failed (${response.status}).`);
  }

  return data;
}

function getImageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

function formatCurrency(amount) {
  return `NPR ${Number(amount || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function makeSku(slug, color, size, index) {
  const parts = [slug, color, size]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${parts || "product"}-${index + 1}`.slice(0, 100);
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
  const [variants, setVariants] = useState([createEmptyVariant()]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const fetchProducts = useCallback(async () => {
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

      const productList = Array.isArray(productsData)
        ? productsData
        : productsData.items || productsData.products || [];

      const productsWithStock = await Promise.all(
        productList.map(async (product) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/products/${product.id}/variants`,
              { headers }
            );

            if (!response.ok) {
              return { ...product, stock_quantity: null };
            }

            const data = await response.json();

            const totalStock = Array.isArray(data)
              ? data.reduce(
                  (total, variant) =>
                    total +
                    Number(
                      variant.inventory?.stock_quantity ??
                        variant.inventory?.available_quantity ??
                        0
                    ),
                  0
                )
              : 0;

            return {
              ...product,
              stock_quantity: totalStock,
              variant_count: Array.isArray(data) ? data.length : 0,
            };
          } catch {
            return { ...product, stock_quantity: null };
          }
        })
      );

      setProducts(productsWithStock);
      setCategories(
        Array.isArray(categoriesData)
          ? categoriesData
          : categoriesData.items || []
      );
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
        product.slug?.toLowerCase().includes(query) ||
        String(product.id).includes(query);

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

  const publishedCount = products.filter(
    (product) => product.is_active
  ).length;

  const resetImage = () => {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");
  };

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

  const handleVariantChange = (key, field, value) => {
    setVariants((previous) =>
      previous.map((variant) =>
        variant.key === key
          ? { ...variant, [field]: value }
          : variant
      )
    );

    setFormError("");
  };

  const addVariant = () => {
    setVariants((previous) => [...previous, createEmptyVariant()]);
  };

  const removeVariant = (key) => {
    setVariants((previous) =>
      previous.length > 1
        ? previous.filter((variant) => variant.key !== key)
        : previous
    );
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setFormError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    resetImage();
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError("");
  };

  const openCreateForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setVariants([createEmptyVariant()]);
    resetImage();
    setFormError("");
    setError("");
    setSuccess("");
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    if (saving) return;

    setShowCreateForm(false);
    setFormError("");
    resetImage();
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

    if (name.length < 2) {
      setFormError("Product name must contain at least 2 characters.");
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setFormError("Use a valid lowercase slug with letters, numbers, and hyphens.");
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

    const preparedVariants = variants.map((variant, index) => {
      const color = variant.color.trim();
      const size = variant.size.trim();
      const stock = Number(variant.stock_quantity);
      const sku = variant.sku.trim() || makeSku(slug, color, size, index);

      return { ...variant, color, size, stock, sku };
    });

    for (let index = 0; index < preparedVariants.length; index += 1) {
      const variant = preparedVariants[index];

      if (!variant.color && !variant.size) {
        setFormError(
          `Variant ${index + 1}: enter at least a color or a size.`
        );
        return;
      }

      if (!variant.sku || variant.sku.length < 2) {
        setFormError(`Variant ${index + 1}: SKU must contain at least 2 characters.`);
        return;
      }

      if (variant.sku.length > 100) {
        setFormError(`Variant ${index + 1}: SKU cannot exceed 100 characters.`);
        return;
      }

      if (!Number.isSafeInteger(variant.stock) || variant.stock < 0) {
        setFormError(`Variant ${index + 1}: stock must be a non-negative whole number.`);
        return;
      }
    }

    const skus = preparedVariants.map((variant) => variant.sku.toLowerCase());

    if (new Set(skus).size !== skus.length) {
      setFormError("Each variant must have a unique SKU.");
      return;
    }

    setSaving(true);

    let createdProduct = null;
    let createdVariantCount = 0;

    try {
      // The backend variant endpoint currently requires an active product.
      // Create it as active first, then apply the requested status at the end.
      const productResponse = await fetch(`${API_BASE_URL}/api/products`, {
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
          is_active: true,
          is_featured: formData.is_featured,
          is_new: formData.is_new,
          is_limited: formData.is_limited,
        }),
      });

      createdProduct = await readResponse(productResponse);

      // Create every variant and its initial inventory.
      for (const variant of preparedVariants) {
        const variantResponse = await fetch(
          `${API_BASE_URL}/api/products/${createdProduct.id}/variants`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sku: variant.sku,
              color: variant.color || null,
              size: variant.size || null,
              stock_quantity: variant.stock,
              is_active: true,
            }),
          }
        );

        await readResponse(variantResponse);
        createdVariantCount += 1;
      }

      let imageWarning = "";

      if (selectedImage) {
        const uploadForm = new FormData();
        uploadForm.append("file", selectedImage);
        uploadForm.append("alt_text", name);

        try {
          const uploadResponse = await fetch(
            `${API_BASE_URL}/api/products/${createdProduct.id}/images/upload`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: uploadForm,
            }
          );

          await readResponse(uploadResponse);
        } catch (uploadError) {
          imageWarning = ` Image upload failed: ${uploadError.message}`;
        }
      }

      // Apply inactive status only after variants have been created.
      if (!formData.is_active) {
        const statusResponse = await fetch(
          `${API_BASE_URL}/api/products/${createdProduct.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ is_active: false }),
          }
        );

        await readResponse(statusResponse);
      }

      setSuccess(
        `"${name}" created with ${createdVariantCount} variant(s).${imageWarning}`
      );

      setShowCreateForm(false);
      setFormData(INITIAL_FORM_DATA);
      setVariants([createEmptyVariant()]);
      resetImage();

      await fetchProducts();
    } catch (err) {
      if (createdProduct) {
        setFormError(
          `The product was created, but only ${createdVariantCount} of ${preparedVariants.length} variants were saved. ${err.message} Refresh the list before retrying to avoid creating a duplicate product.`
        );
        await fetchProducts();
      } else {
        setFormError(err.message || "Unable to create product.");
      }
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
            Manage your collection, product details, pricing, variants, and inventory.
          </p>
        </div>

        <div className="admin-products-header-actions">
          <button
            type="button"
            className="admin-products-refresh"
            onClick={fetchProducts}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "admin-products-spinning" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="admin-products-add"
            onClick={openCreateForm}
          >
            <Plus size={17} />
            Add Product
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-products-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="admin-products-success" role="status">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss success">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="admin-products-summary">
        <div>
          <span className="admin-products-summary-label">Total products</span>
          <strong>{products.length}</strong>
        </div>
        <div>
          <span className="admin-products-summary-label">Published</span>
          <strong>{publishedCount}</strong>
        </div>
        <div>
          <span className="admin-products-summary-label">Inactive</span>
          <strong>{products.length - publishedCount}</strong>
        </div>
      </section>

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

            {/* VARIANTS AND INVENTORY */}
            <section className="admin-products-variants-panel">
              <div className="admin-products-variants-heading">
                <div>
                  <p className="admin-products-eyebrow">PRODUCT OPTIONS</p>
                  <h3>Sizes, colors & stock</h3>
                  <p className="admin-products-help">
                    Add one row for each sellable combination. Stock is tracked separately for every variant.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-products-add-variant"
                  onClick={addVariant}
                  disabled={saving}
                >
                  <Plus size={15} />
                  Add Variant
                </button>
              </div>

              <div className="admin-products-variant-list">
                {variants.map((variant, index) => (
                  <div className="admin-products-variant-row" key={variant.key}>
                    <div className="admin-products-variant-title">
                      <span>Variant {index + 1}</span>

                      <button
                        type="button"
                        onClick={() => removeVariant(variant.key)}
                        disabled={saving || variants.length === 1}
                        aria-label={`Remove variant ${index + 1}`}
                        title="Remove variant"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="admin-products-variant-fields">
                      <label className="admin-products-field">
                        Color
                        <input
                          value={variant.color}
                          onChange={(event) =>
                            handleVariantChange(variant.key, "color", event.target.value)
                          }
                          placeholder="e.g. Ivory"
                          maxLength={100}
                        />
                      </label>

                      <label className="admin-products-field">
                        Size
                        <input
                          value={variant.size}
                          onChange={(event) =>
                            handleVariantChange(variant.key, "size", event.target.value)
                          }
                          placeholder="e.g. M or 42"
                          maxLength={50}
                        />
                      </label>

                      <label className="admin-products-field">
                        Initial stock *
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={variant.stock_quantity}
                          onChange={(event) =>
                            handleVariantChange(
                              variant.key,
                              "stock_quantity",
                              event.target.value
                            )
                          }
                          required
                        />
                      </label>

                      <label className="admin-products-field admin-products-variant-sku">
                        SKU
                        <input
                          value={variant.sku}
                          onChange={(event) =>
                            handleVariantChange(variant.key, "sku", event.target.value)
                          }
                          placeholder={makeSku(
                            formData.slug || "product",
                            variant.color,
                            variant.size,
                            index
                          )}
                          maxLength={100}
                        />
                        <span className="admin-products-help">
                          Leave blank to generate a SKU automatically.
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <p className="admin-products-help">
                Enter at least a color or a size for each variant. Each SKU must be unique.
              </p>
            </section>

            <div className="admin-products-upload">
              <div>
                <p className="admin-products-upload-title">Product image</p>
                <p className="admin-products-help">JPEG, PNG, or WebP · Maximum 5 MB</p>
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
                  <button type="button" onClick={resetImage} disabled={saving}>
                    <X size={14} />
                    Remove image
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

              <button type="submit" className="admin-products-add" disabled={saving}>
                <Save size={15} />
                {saving ? "Saving product and variants..." : "Save Product"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-products-toolbar">
        <label className="admin-products-search">
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product name, slug, or ID..."
          />
        </label>

        <select
          className="admin-products-filter"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="ALL">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          className="admin-products-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by publication status"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Published</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </section>

      <section className="admin-products-results">
        <span>
          Showing {filteredProducts.length} of {products.length} products
        </span>
      </section>

      <section className="admin-products-table-wrapper">
        {loading ? (
          <div className="admin-products-empty">
            <RefreshCw size={22} className="admin-products-spinning" />
            <span>Loading collection...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-products-empty">
            <Package size={30} />
            <strong>No products found</strong>
            <span>Try changing your search or filters, or add a new product.</span>
          </div>
        ) : (
          <table className="admin-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Variants / Stock</th>
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
                        {primaryImage?.image_url ? (
                          <img
                            className="admin-products-thumbnail"
                            src={getImageUrl(primaryImage.image_url)}
                            alt={primaryImage.alt_text || product.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="admin-products-thumbnail-placeholder">
                            <ImagePlus size={18} />
                          </div>
                        )}

                        <div className="admin-products-name">
                          <strong>{product.name}</strong>
                          <span>{product.slug}</span>
                          <small>Product ID: {product.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      {product.category?.name ||
                        categories.find((category) => category.id === product.category_id)?.name ||
                        "Uncategorized"}
                    </td>

                    <td className="admin-products-price">
                      {formatCurrency(product.price)}
                    </td>

                    <td>
                      <span className="admin-products-stock">
                        <Package size={14} />
                        {product.stock_quantity === null
                          ? "Unavailable"
                          : `${product.variant_count ?? 0} variants · ${product.stock_quantity} units`}
                      </span>
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
                          !product.is_limited &&
                          "—"}
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