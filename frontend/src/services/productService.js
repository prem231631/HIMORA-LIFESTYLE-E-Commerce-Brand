const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";


async function handleResponse(response, errorMessage) {
    if (!response.ok) {
        throw new Error(errorMessage);
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


export async function getProduct(productId) {
    const response = await fetch(
        `${API_BASE_URL}/api/products/${productId}`
    );

    return handleResponse(
        response,
        "Failed to load product."
    );
}


export async function getProductVariants(productId) {
    const response = await fetch(
        `${API_BASE_URL}/api/products/${productId}/variants`
    );

    return handleResponse(
        response,
        "Failed to load product variants."
    );
}