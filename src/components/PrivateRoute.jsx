import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function PrivateRoute({ children }) {
  const { isAuthed, loading } = useAuth();
  if (loading) {
    return (
      <div className="page">
        <div className="card card-body space-y-4">
          <div className="h-5 w-40 skeleton"></div>
          <div className="space-y-3">
            <div className="h-4 w-24 skeleton"></div>
            <div className="h-10 w-full skeleton"></div>
            <div className="h-4 w-24 skeleton"></div>
            <div className="h-10 w-full skeleton"></div>
          </div>
        </div>
      </div>
    );
  }
  return isAuthed ? children : <Navigate to="/login" replace />;
}
