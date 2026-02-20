import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import axios from "axios";

export default function ApiExplorer() {
  const [spec, setSpec] = useState(null);
  const [selected, setSelected] = useState(null); // { path, method, op }
  const [params, setParams] = useState({});
  const [body, setBody] = useState("{}");
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSpec = async () => {
      setError("");
      try {
        const apiBase = import.meta?.env?.VITE_API_BASE_URL || "/api";
        const openapiBase = apiBase.replace(/\/?api\/?$/, "");
        const url = `${openapiBase}/v3/api-docs`;
        const { data } = await axios.get(url);
        setSpec(data);
      } catch (e) {
        setError("Cannot load OpenAPI docs. Check VITE_API_BASE_URL and backend.");
      }
    };
    fetchSpec();
  }, []);

  const operations = useMemo(() => {
    if (!spec?.paths) return [];
    const ops = [];
    for (const path of Object.keys(spec.paths)) {
      const item = spec.paths[path];
      for (const method of Object.keys(item)) {
        const op = item[method];
        ops.push({ path, method: method.toUpperCase(), op });
      }
    }
    return ops.sort((a, b) => a.path.localeCompare(b.path));
  }, [spec]);

  const visibleParams = useMemo(() => {
    if (!selected) return [];
    return selected.op.parameters || [];
  }, [selected]);

  const onSelect = (entry) => {
    setSelected(entry);
    setParams({});
    setResp(null);
    if (entry.op.requestBody) setBody("{}");
    else setBody("");
  };

  const buildUrl = () => {
    if (!selected) return "";
    let url = selected.path;
    visibleParams
      .filter((p) => p.in === "path")
      .forEach((p) => {
        url = url.replace(`{${p.name}}`, encodeURIComponent(params[p.name] || ""));
      });
    const q = visibleParams.filter((p) => p.in === "query" && params[p.name] != null && params[p.name] !== "");
    if (q.length) {
      const search = new URLSearchParams();
      q.forEach((p) => search.set(p.name, params[p.name]));
      url += `?${search.toString()}`;
    }
    return url;
  };

  const send = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    setResp(null);
    try {
      const url = buildUrl();
      const cfg = { url, method: selected.method.toLowerCase() };
      if (selected.op.requestBody && body) {
        cfg.headers = { "Content-Type": "application/json" };
        cfg.data = JSON.parse(body);
      }
      const r = await api.request(cfg);
      setResp({
        status: r.status,
        statusText: r.statusText,
        headers: r.headers,
        data: r.data,
      });
    } catch (e) {
      const r = e.response;
      if (r) {
        setResp({
          status: r.status,
          statusText: r.statusText,
          headers: r.headers,
          data: r.data,
        });
      } else {
        setError(e.message || "Request failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page space-y-6">
      <header className="space-y-3">
        <h1 className="page-title">API Explorer</h1>
        <p className="page-subtitle">Browse the OpenAPI schema and test endpoints directly.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="card card-body space-y-4">
          <h2 className="section-title">Endpoints</h2>
          {!spec && !error && <p className="text-sm text-slate-500">Loading OpenAPI...</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {operations.map((o, i) => (
              <button
                key={i}
                className={`w-full rounded-2xl px-3 py-2 text-left transition ${
                  selected?.path === o.path && selected?.method === o.method
                    ? "bg-sky-50"
                    : "hover:bg-slate-50"
                }`}
                onClick={() => onSelect(o)}
                title={o.op.summary || ""}
              >
                <div className="flex items-center gap-3">
                  <span className="badge badge-neutral">{o.method}</span>
                  <span className="font-mono text-sm text-slate-600">{o.path}</span>
                </div>
                {o.op.summary && <div className="text-xs text-slate-500 mt-1">{o.op.summary}</div>}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card card-body space-y-4">
            <h2 className="section-title">Request</h2>
            {!selected && <p className="text-sm text-slate-500">Select an endpoint to begin.</p>}
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="badge">{selected.method}</span>
                  <code className="rounded-xl bg-slate-100 px-3 py-1 text-sm">/api{selected.path}</code>
                </div>
                {selected.op.summary && <p className="text-sm text-slate-600">{selected.op.summary}</p>}
                {!!visibleParams.length && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleParams.map((p) => (
                      <label key={p.name} className="block text-sm">
                        <span className="label">
                          {p.name} <span className="text-slate-400">({p.in})</span>
                          {p.required ? <span className="text-rose-500 ml-1">*</span> : null}
                        </span>
                        <input
                          className="input"
                          value={params[p.name] || ""}
                          onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                          placeholder={p.schema?.type || "value"}
                        />
                      </label>
                    ))}
                  </div>
                )}
                {selected.op.requestBody && (
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">JSON Body</label>
                    <textarea
                      className="input font-mono text-sm min-h-[160px]"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </div>
                )}
                <button className="btn btn-primary" onClick={send} disabled={loading}>
                  {loading ? "Sending..." : "Send"}
                </button>
              </div>
            )}
          </div>

          <div className="card card-body space-y-4">
            <h2 className="section-title">Response</h2>
            {!resp && <p className="text-sm text-slate-500">No response yet.</p>}
            {resp && (
              <div className="space-y-3">
                <div className="text-sm text-slate-600">
                  Status: {resp.status} {resp.statusText}
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer select-none">Headers</summary>
                  <pre className="mt-2 rounded-xl bg-slate-900 p-3 text-xs text-slate-100 overflow-auto">
                    {JSON.stringify(resp.headers, null, 2)}
                  </pre>
                </details>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Body</div>
                  <pre className="rounded-xl bg-slate-900 p-3 text-sm text-slate-100 overflow-auto max-h-80">
                    {typeof resp.data === "object" ? JSON.stringify(resp.data, null, 2) : String(resp.data)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
