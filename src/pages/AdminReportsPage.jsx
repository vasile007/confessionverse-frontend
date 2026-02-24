import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";

const REPORT_ENDPOINT_CANDIDATES = ["/reports", "/admin/reports"];

async function tryGetReports() {
  for (const path of REPORT_ENDPOINT_CANDIDATES) {
    try {
      const res = await api.get(path);
      return { path, data: Array.isArray(res.data) ? res.data : [] };
    } catch {}
  }
  throw new Error("No reports endpoint available");
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [decisionMap, setDecisionMap] = useState({});
  const [adminNoteMap, setAdminNoteMap] = useState({});
  const [rowMessageMap, setRowMessageMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [activeListPath, setActiveListPath] = useState("/reports");

  const getReporterEmail = (report) =>
    String(
      report?.reporterEmail ||
        report?.reportedByEmail ||
        report?.createdByEmail ||
        report?.reporter?.email ||
        report?.reportedBy?.email ||
        report?.userEmail ||
        report?.reportedUserEmail ||
        report?.targetEmail ||
        report?.ownerEmail ||
        report?.email ||
        ""
    ).trim();

  const loadReports = async () => {
    setLoading(true);
    setError("");
    try {
      const { path, data } = await tryGetReports();
      setActiveListPath(path);
      setReports(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load reports. Verify backend report endpoints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const status = String(r.status || "PENDING").toUpperCase();
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      if (!matchesStatus) return false;

      if (!q) return true;
      return [r.id, r.reason, r.description, r.confessionId, r.username, r.reportedBy]
        .map((x) => String(x || "").toLowerCase())
        .some((x) => x.includes(q));
    });
  }, [reports, search, statusFilter]);

  const updateLocalStatus = (id, nextStatus) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
  };

  const handleStatus = async (report, nextStatus) => {
    if (!report?.id) return;
    const reporterEmail = getReporterEmail(report);
    const adminNote = String(adminNoteMap[report.id] || "").trim();

    if (!reporterEmail) {
      setRowMessageMap((prev) => ({
        ...prev,
        [report.id]: { type: "error", text: "Missing user email in report data." },
      }));
      toast.error("Cannot submit without user email.");
      return;
    }
    if (!adminNote) {
      setRowMessageMap((prev) => ({
        ...prev,
        [report.id]: { type: "error", text: "Admin message is required before submit." },
      }));
      toast.error("Write an admin message before submit.");
      return;
    }

    setActioningId(report.id);
    setRowMessageMap((prev) => ({
      ...prev,
      [report.id]: { type: "info", text: "Submitting moderation action..." },
    }));
    try {
      const attempts = [
        () => api.put(`/admin/reports/${report.id}/status`, { status: nextStatus, adminNote }),
        () => api.patch(`/admin/reports/${report.id}/status`, { status: nextStatus, adminNote }),
        () => api.put(`/reports/${report.id}/status`, { status: nextStatus, adminNote }),
        () => api.patch(`/reports/${report.id}/status`, { status: nextStatus, adminNote }),
        () => api.put(`/admin/reports/${report.id}`, { ...report, status: nextStatus, adminNote }),
        () => api.put(`/reports/${report.id}`, { ...report, status: nextStatus, adminNote }),
      ];

      let updated = false;
      for (const run of attempts) {
        try {
          await run();
          updated = true;
          break;
        } catch {}
      }

      if (!updated) {
        setRowMessageMap((prev) => ({
          ...prev,
          [report.id]: { type: "error", text: "Status update endpoint is not available." },
        }));
        toast.error("Status endpoint not available in backend.");
        return;
      }

      updateLocalStatus(report.id, nextStatus);
      toast.success(`Report marked ${nextStatus.toLowerCase()}`);

      const emailAttempts = [
        () =>
          api.post(`/admin/reports/${report.id}/notify`, {
            status: nextStatus,
            recipientEmail: reporterEmail,
            adminNote,
            sendEmail: true,
          }),
        () =>
          api.post(`/reports/${report.id}/notify`, {
            status: nextStatus,
            recipientEmail: reporterEmail,
            adminNote,
            sendEmail: true,
          }),
        () =>
          api.post(`/admin/reports/${report.id}/email`, {
            status: nextStatus,
            recipientEmail: reporterEmail,
            adminNote,
            sendEmail: true,
          }),
        () =>
          api.post(`/reports/${report.id}/email`, {
            status: nextStatus,
            recipientEmail: reporterEmail,
            adminNote,
            sendEmail: true,
          }),
      ];

      let emailed = false;
      for (const run of emailAttempts) {
        try {
          await run();
          emailed = true;
          break;
        } catch {}
      }

      if (emailed) {
        toast.success("Message sent to user");
        setRowMessageMap((prev) => ({
          ...prev,
          [report.id]: { type: "success", text: `Message sent to ${reporterEmail}.` },
        }));
      } else {
        setRowMessageMap((prev) => ({
          ...prev,
          [report.id]: { type: "error", text: "Status updated, but email endpoint is not available." },
        }));
        toast.error("Status updated, but email was not sent.");
      }

      setDecisionMap((prev) => {
        const next = { ...prev };
        delete next[report.id];
        return next;
      });
      setAdminNoteMap((prev) => ({ ...prev, [report.id]: "" }));
    } catch (err) {
      console.error(err);
      setRowMessageMap((prev) => ({
        ...prev,
        [report.id]: { type: "error", text: "Operation failed. Check backend permissions/endpoints." },
      }));
      toast.error(err?.response?.data?.error || "Unable to update report");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="page admin-page space-y-5">
      <header className="admin-hero space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="page-title">Admin Reports</h1>
          <Link to="/admin" className="btn btn-secondary admin-btn">
            Return to admin
          </Link>
        </div>
        <p className="page-subtitle">Review flagged content and close moderation cases.</p>
      </header>

      <section className="card card-body admin-card space-y-3">
        <div className="admin-toolbar flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="section-title">Reports queue</h2>
            <p className="text-sm text-slate-500">Source endpoint: {activeListPath}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="input w-72"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button className="btn btn-secondary admin-btn" onClick={loadReports}>
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 skeleton"></div>
            ))}
          </div>
        )}

        {!loading && error && <div className="text-sm text-rose-600">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-sm text-slate-600">No reports found for this filter.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="admin-table">
              <thead>
                <tr className="bg-black/20">
                  <th>ID</th>
                  <th>Confession</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((report) => {
                  const status = String(report.status || "PENDING").toUpperCase();
                  const reporterEmail = getReporterEmail(report);
                  const selectedDecision = decisionMap[report.id];
                  const adminNote = adminNoteMap[report.id] || "";
                  const rowMessage = rowMessageMap[report.id];
                  const rowMessageClass =
                    rowMessage?.type === "success"
                      ? "text-emerald-600"
                      : rowMessage?.type === "error"
                      ? "text-rose-600"
                      : "text-amber-600";
                  return (
                    <tr key={report.id}>
                      <td>{report.id}</td>
                      <td>{report.confessionId || "-"}</td>
                      <td className="max-w-[420px]">
                        <div className="font-medium">{report.reason || "-"}</div>
                        {report.description && <div className="text-xs text-slate-500">{report.description}</div>}
                      </td>
                      <td>{status}</td>
                      <td>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button
                              className={`btn admin-btn ${
                                selectedDecision === "RESOLVED"
                                  ? "report-decision-btn--resolve-active"
                                  : "btn-secondary"
                              }`}
                              disabled={actioningId === report.id || status === "RESOLVED"}
                              onClick={() => {
                                setDecisionMap((prev) => ({ ...prev, [report.id]: "RESOLVED" }));
                                setRowMessageMap((prev) => ({
                                  ...prev,
                                  [report.id]: { type: "info", text: "Resolve selected. Click Submit." },
                                }));
                              }}
                            >
                              {selectedDecision === "RESOLVED" ? "Resolve selected" : "Resolve"}
                            </button>
                            <button
                              className={`btn admin-btn ${
                                selectedDecision === "REJECTED"
                                  ? "report-decision-btn--reject-active"
                                  : "btn-secondary"
                              }`}
                              disabled={actioningId === report.id || status === "REJECTED"}
                              onClick={() => {
                                setDecisionMap((prev) => ({ ...prev, [report.id]: "REJECTED" }));
                                setRowMessageMap((prev) => ({
                                  ...prev,
                                  [report.id]: { type: "info", text: "Reject selected. Click Submit." },
                                }));
                              }}
                            >
                              {selectedDecision === "REJECTED" ? "Reject selected" : "Reject"}
                            </button>
                          </div>
                          <input
                            className="input"
                            value={reporterEmail}
                            placeholder="Reporter email (required)"
                            readOnly
                          />
                          <textarea
                            className="input min-h-[72px]"
                            value={adminNote}
                            onChange={(e) =>
                              setAdminNoteMap((prev) => ({ ...prev, [report.id]: e.target.value }))
                            }
                            placeholder="Admin message for email (required)"
                          />
                          <button
                            className="btn btn-primary admin-btn"
                            disabled={actioningId === report.id || !selectedDecision || !reporterEmail || !adminNote.trim()}
                            onClick={() => handleStatus(report, selectedDecision)}
                          >
                            {actioningId === report.id ? "Submitting..." : "Submit"}
                          </button>
                          {!reporterEmail && (
                            <div className="text-xs text-rose-600">
                              Missing user email from backend. Cannot submit.
                            </div>
                          )}
                          {reporterEmail && !adminNote.trim() && (
                            <div className="text-xs text-rose-600">
                              Add a short admin message before submit.
                            </div>
                          )}
                          {rowMessage?.text && (
                            <div className={`text-xs ${rowMessageClass}`}>{rowMessage.text}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
