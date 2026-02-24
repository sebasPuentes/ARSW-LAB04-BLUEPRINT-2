import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export default function useUpdateBlueprint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateBlueprint = useCallback(async (author, name, points) => {
    if (!author || !name) return null;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/blueprints/${author}/${name}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ author, name, points }),
        }
      );
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Error updating blueprint");
      }

      return json.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateBlueprint, loading, error };
}
