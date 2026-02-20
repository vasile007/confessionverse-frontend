import { useCallback, useEffect, useState } from "react";
import api from "../api";

export default function usePublicConfessions({ autoLoad = true } = {}) {
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConfessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/confessions/public");
      setConfessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load public confessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadConfessions();
    }
  }, [autoLoad, loadConfessions]);

  return {
    confessions,
    setConfessions,
    loading,
    error,
    loadConfessions,
  };
}
