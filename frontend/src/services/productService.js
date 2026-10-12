const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function handleResponse(response, errorMessage) {
    if (!response.ok) {
        let message = errorMessage;

        try {
            const data = await response.json();

            if (typeof data.detail === "string") {
                message = data.detail;
            } else if (Array.isArray(data.detail)) {
                message = data.detail
                    .map((item) => item.msg)
                    .filter(Boolean)
                    .join(", ");
            }
        } catch {
            // Keep the default error message if the response is not JSON.
        }

        throw new Error(message);
    }

    return response.json();
}

export async function getFeaturedProducts() {
    const response = await fetch(
        `${API_BASE_URL}/api/products/featured`
    );

    return handleResponse(
        response,
        "Failed to load featured products."
    );
}

export async function getProduct(productSlugOrId) {
    if (
        productSlugOrId === undefined ||
        productSlugOrId === null ||
        String(productSlugOrId).trim() === ""
    ) {
        throw new Error("A product identifier is required.");
    }

    const response = await fetch(
        `${API_BASE_URL}/api/products/${encodeURIComponent(
            productSlugOrId
        )}`
    );

    return handleResponse(
        response,
        "Failed to load product."
    );
}

export async function getProductVariants(productId) {
    if (
        productId === undefined ||
        productId === null ||
        String(productId).trim() === ""
    ) {
        throw new Error("A product ID is required to load variants.");
    }

    const response = await fetch(
        `${API_BASE_URL}/api/products/${encodeURIComponent(
            productId
        )}/variants`
    );

    return handleResponse(
        response,
        "Failed to load product variants."
    );
}