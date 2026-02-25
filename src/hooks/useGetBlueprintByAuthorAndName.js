import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export default function useGetBlueprintByAuthorAndName() {
  const [blueprint, setBlueprint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBlueprint = useCallback(async (author, name) => {
    if (!author || !name) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/blueprints/${author}/${name}`
      );
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Error fetching blueprint");
      }

      setBlueprint(json.data ?? null);
    } catch (err) {
      setError(err.message);
      setBlueprint(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { blueprint, setBlueprint, loading, error, fetchBlueprint };
}
