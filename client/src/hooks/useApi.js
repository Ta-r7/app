import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

export function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { autoFetch = true, method = 'GET', body = null } = options;

  const fetchData = useCallback(async (overrideBody) => {
    setLoading(true);
    setError(null);
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (overrideBody || body) {
        opts.body = JSON.stringify(overrideBody || body);
      }
      const res = await fetch(`${API_BASE}${endpoint}`, opts);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, body]);

  useEffect(() => {
    if (autoFetch && method === 'GET') {
      fetchData();
    }
  }, [autoFetch, method, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPut(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
