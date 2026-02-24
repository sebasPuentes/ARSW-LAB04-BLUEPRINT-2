import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export default function useCreateBlueprint() {
  const [createdBlueprint, setCreatedBlueprint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createBlueprint = useCallback(async (author, name, points = []) => {
    if (!author || !name) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/blueprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, name, points }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Error creating blueprint");
      }

      setCreatedBlueprint(json.data ?? null);
      return json.data;
    } catch (err) {
      setError(err.message);
      setCreatedBlueprint(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createdBlueprint, loading, error, createBlueprint };
}
