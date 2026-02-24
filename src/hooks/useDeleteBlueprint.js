import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export default function useDeleteBlueprint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteBlueprint = useCallback(async (author, name) => {
    if (!author || !name) return false;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/blueprints/${author}/${name}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.message || "Error deleting blueprint");
      }

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteBlueprint, loading, error };
}
