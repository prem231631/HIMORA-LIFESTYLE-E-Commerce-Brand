import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Edit3,
  FolderTree,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import "./AdminCategories.css";

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
    const result = await response.json().catch(() => ({}));
    throw new Error(
      result.detail || `Request failed with status ${response.status}.`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
};

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [autoSlug, setAutoSlug] = useState(true);

  const loadCategories = useCallback(async (refresh = false) => {
    setError("");

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await apiRequest("/api/categories");

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load categories.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = categories.filter((category) => {
    const term = search.trim().toLowerCase();

    if (!term) return true;

    return (
      category.name?.toLowerCase().includes(term) ||
      category.slug?.toLowerCase().includes(term) ||
      category.description?.toLowerCase().includes(term)
    );
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setAutoSlug(true);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
    });
    setAutoSlug(false);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setAutoSlug(true);
  };

  const handleNameChange = (value) => {
    setForm((previous) => ({
      ...previous,
      name: value,
      ...(autoSlug ? { slug: createSlug(value) } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const slug = form.slug.trim() || createSlug(name);
    const description = form.description.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    if (!slug) {
      setError("A valid category slug is required.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.slug?.toLowerCase() === slug.toLowerCase() &&
        category.id !== editingCategory?.id,
    );

    if (duplicate) {
      setError("A category with this slug already exists.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name,
        slug,
        description: description || null,
      };

      if (editingCategory) {
        await apiRequest(
          `/api/categories/${editingCategory.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );

        setSuccess("Category updated successfully.");
      } else {
        await apiRequest("/api/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Category created successfully.");
      }

      setModalOpen(false);
      setEditingCategory(null);
      setForm(EMPTY_FORM);
      await loadCategories(true);
    } catch (err) {
      setError(err.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Delete the category "${category.name}"? This action may be unavailable if products are assigned to it.`,
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      setCategories((previous) =>
        previous.filter((item) => item.id !== category.id),
      );

      setSuccess(`"${category.name}" was deleted successfully.`);
    } catch (err) {
      setError(err.message || "Unable to delete category.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="admin-categories">
      <header className="admin-categories__header">
        <div>
          <span className="admin-categories__eyebrow">
            HIMORA LIFESTYLE / ADMINISTRATION
          </span>

          <h1>Product Categories</h1>

          <p>
            Organize your collections and manage the categories in your
            storefront.
          </p>
        </div>

        <div className="admin-categories__header-actions">
          <button
            type="button"
            className="admin-categories__refresh"
            onClick={() => loadCategories(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <LoaderCircle
                size={16}
                className="admin-categories__spin"
              />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>

          <button
            type="button"
            className="admin-categories__create"
            onClick={openCreateModal}
          >
            <Plus size={17} />
            Add Category
          </button>
        </div>
      </header>

      {error && !modalOpen && (
        <div className="admin-categories__alert admin-categories__alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="admin-categories__alert admin-categories__alert--success">
          <Check size={18} />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>
            Dismiss
          </button>
        </div>
      )}

      <section className="admin-categories__summary">
        <div className="admin-categories__summary-icon">
          <FolderTree size={23} />
        </div>

        <div>
          <span>Total Categories</span>
          <strong>{categories.length}</strong>
          <small>Product collections currently registered</small>
        </div>
      </section>

      <section className="admin-categories__panel">
        <div className="admin-categories__toolbar">
          <div>
            <h2>All Categories</h2>
            <p>Manage category names, slugs, and descriptions.</p>
          </div>

          <label className="admin-categories__search">
            <Search size={17} />

            <input
              type="search"
              placeholder="Search categories..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="admin-categories__state">
            <LoaderCircle
              size={27}
              className="admin-categories__spin"
            />
            <p>Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="admin-categories__state">
            <FolderTree size={35} />
            <h3>
              {search ? "No matching categories" : "No categories yet"}
            </h3>
            <p>
              {search
                ? "Try a different search term."
                : "Create your first category to organize your products."}
            </p>

            {!search && (
              <button
                type="button"
                className="admin-categories__create"
                onClick={openCreateModal}
              >
                <Plus size={16} />
                Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="admin-categories__table-wrap">
            <table className="admin-categories__table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Category ID</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className="admin-categories__name">
                        <span className="admin-categories__name-icon">
                          <FolderTree size={17} />
                        </span>
                        <strong>{category.name}</strong>
                      </div>
                    </td>

                    <td>
                      <code className="admin-categories__slug">
                        {category.slug}
                      </code>
                    </td>

                    <td>
                      <span className="admin-categories__description">
                        {category.description || "No description"}
                      </span>
                    </td>

                    <td>
                      <span className="admin-categories__id">
                        #{category.id}
                      </span>
                    </td>

                    <td>
                      <div className="admin-categories__actions">
                        <button
                          type="button"
                          className="admin-categories__edit"
                          title="Edit category"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => openEditModal(category)}
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          className="admin-categories__delete"
                          title="Delete category"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id}
                        >
                          {deletingId === category.id ? (
                            <LoaderCircle
                              size={15}
                              className="admin-categories__spin"
                            />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="admin-categories__footer">
          <span>
            Showing {filteredCategories.length} of {categories.length} categories
          </span>
          <span>HIMORA LIFESTYLE · Collections</span>
        </footer>
      </section>

      {modalOpen && (
        <div
          className="admin-categories__overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="admin-categories__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-category-modal-title"
          >
            <header className="admin-categories__modal-header">
              <div>
                <span className="admin-categories__eyebrow">
                  CATEGORY MANAGEMENT
                </span>

                <h2 id="admin-category-modal-title">
                  {editingCategory ? "Edit Category" : "Create Category"}
                </h2>
              </div>

              <button
                type="button"
                className="admin-categories__close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </header>

            {error && (
              <div className="admin-categories__alert admin-categories__alert--error">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            <form
              className="admin-categories__form"
              onSubmit={handleSubmit}
            >
              <label>
                Category Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="e.g. Clothing"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Category Slug
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) => {
                    setAutoSlug(false);
                    setForm((previous) => ({
                      ...previous,
                      slug: createSlug(event.target.value),
                    }));
                  }}
                  placeholder="e.g. clothing"
                  maxLength={120}
                  required
                />
                <small>
                  Used in category URLs. Only lowercase letters, numbers, and
                  hyphens are allowed.
                </small>
              </label>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe this collection..."
                  rows={4}
                  maxLength={1000}
                />
              </label>

              <div className="admin-categories__form-actions">
                <button
                  type="button"
                  className="admin-categories__cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-categories__submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="admin-categories__spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingCategory
                        ? "Save Changes"
                        : "Create Category"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}