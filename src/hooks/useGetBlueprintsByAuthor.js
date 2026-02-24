import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export default function useGetBlueprintsByAuthor() {
  const [blueprints, setBlueprints] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBlueprints = useCallback(async (author) => {
    if (!author) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/blueprints/${author}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Error fetching blueprints");
      }

      const data = json.data ?? [];
      const bpArray = Array.isArray(data) ? data : [data];
      setBlueprints(bpArray);

      const total = bpArray.reduce(
        (sum, bp) => sum + (bp.points?.length ?? 0),
        0
      );
      setTotalPoints(total);
    } catch (err) {
      setError(err.message);
      setBlueprints([]);
      setTotalPoints(0);
    } finally {
      setLoading(false);
    }
  }, []);

  return { blueprints, totalPoints, loading, error, fetchBlueprints };
}
