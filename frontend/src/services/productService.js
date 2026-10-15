const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

async function handleResponse(response, errorMessage) {
    let data = null;

    try {
        data = await response.json();
    } catch {
        // The server may return an empty or non-JSON response.
    }

    if (!response.ok) {
        const detail = data?.detail;
        let message = errorMessage;

        if (typeof detail === "string" && detail.trim()) {
            message = detail;
        } else if (Array.isArray(detail)) {
            const details = detail
                .map((item) => item?.msg)
                .filter(Boolean);

            if (details.length > 0) {
                message = details.join(", ");
            }
        }

        throw new Error(message);
    }

    return data;
}

async function fetchApi(url, errorMessage, options = {}) {
    let response;

    try {
        response = await fetch(url, options);
    } catch {
        throw new Error(
            "Unable to connect to the server. Please check that the backend is running."
        );
    }

    return handleResponse(response, errorMessage);
}

/**
 * Fetch products marked as featured by the backend.
 */
export async function getFeaturedProducts() {
    return fetchApi(
        `${API_BASE_URL}/api/products/featured`,
        "Failed to load featured products."
    );
}

/**
 * Fetch one product using its slug or ID.
 */
export async function getProduct(productSlugOrId) {
    if (
        productSlugOrId === undefined ||
        productSlugOrId === null ||
        String(productSlugOrId).trim() === ""
    ) {
        throw new Error("A product identifier is required.");
    }

    const identifier = encodeURIComponent(
        String(productSlugOrId).trim()
    );

    return fetchApi(
        `${API_BASE_URL}/api/products/${identifier}`,
        "Failed to load product."
    );
}

/**
 * Fetch variants and their inventory for a product.
 */
export async function getProductVariants(productId) {
    if (
        productId === undefined ||
        productId === null ||
        String(productId).trim() === ""
    ) {
        throw new Error("A product ID is required to load variants.");
    }

    const identifier = encodeURIComponent(String(productId).trim());

    return fetchApi(
        `${API_BASE_URL}/api/products/${identifier}/variants`,
        "Failed to load product variants."
    );
}