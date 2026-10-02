const API_BASE_URL = "http://localhost:8000";

export async function getFeaturedProducts() {
    const response = await fetch(
        `${API_BASE_URL}/api/products/featured`
    );

    if (!response.ok) {
        throw new Error("Failed to load featured products.");
    }

    return response.json();
}