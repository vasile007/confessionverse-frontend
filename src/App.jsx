import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ConfessionsPage from "./pages/ConfessionsPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ApiExplorer from "./pages/ApiExplorer.jsx";
import VotesPage from "./pages/VotesPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import BoostsPage from "./pages/BoostsPage.jsx";
import AIPage from "./pages/AIPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import SubscriptionsPage from "./pages/SubscriptionsPage.jsx";
import PremiumPage from "./pages/PremiumPage.jsx";
import BillingSuccessPage from "./pages/BillingSuccessPage.jsx";
import BillingCancelPage from "./pages/BillingCancelPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import CreateConfessionPage from "./pages/CreateConfessionPage.jsx";
import PublicProfilePage from "./pages/PublicProfilePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AdminConfessionsPage from "./pages/AdminConfessionsPage.jsx";
import AdminReportsPage from "./pages/AdminReportsPage.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import { Toaster, ToastBar, resolveValue, toast as hotToast, useToasterStore } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

export default function App() {
  const { pathname } = useLocation();
  const { toasts } = useToasterStore();
  const isHome = pathname === "/";
  const isAdminRoute = pathname.startsWith("/admin");
  const useChatlikeTheme = !isHome;

  React.useEffect(() => {
    const visible = toasts.filter((t) => t.visible);
    const seen = new Set();
    for (const t of visible) {
      const msg = String(resolveValue(t.message, t) ?? "").trim();
      const key = `${String(t.type || "blank")}|${msg}`;
      if (seen.has(key)) {
        hotToast.dismiss(t.id);
        continue;
      }
      seen.add(key);
    }
  }, [toasts]);

  return (
    <div className={`app-bg app-shell ${isHome ? "" : "app-bg--cool"} ${useChatlikeTheme ? "app-theme--chatlike" : ""}`}>
      <Navbar />
      <main className="app-main">
        <div className={isHome ? "w-full" : "mx-auto w-full max-w-6xl"}>
          <Toaster
            position="top-center"
            containerStyle={{ top: 86 }}
            toastOptions={{
              duration: 3000,
            }}
          >
            {(t) => (
              <ToastBar
                toast={t}
                style={{
                  ...t.style,
                  background: "transparent",
                  boxShadow: "none",
                  padding: 0,
                }}
              >
                {() => (
                  <div className={`cv-toast cv-toast--${t.type || "blank"} ${t.visible ? "is-visible" : "is-hidden"}`}>
                    <div className="cv-toast__message">{resolveValue(t.message, t)}</div>
                    <button
                      type="button"
                      className="cv-toast__close"
                      onClick={() => hotToast.dismiss(t.id)}
                      aria-label="Dismiss notification"
                    >
                      x
                    </button>
                  </div>
                )}
              </ToastBar>
            )}
          </Toaster>
          <ErrorBoundary>
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/api-explorer" element={<ApiExplorer />} />
              <Route path="/billing/success" element={<BillingSuccessPage />} />
              <Route path="/billing/cancel" element={<BillingCancelPage />} />

              {/* Protected */}
              <Route
                path="/confessions"
                element={
                  <PrivateRoute>
                    <ConfessionsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/confessions/new"
                element={
                  <PrivateRoute>
                    <CreateConfessionPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/u/:username"
                element={
                  <PrivateRoute>
                    <PublicProfilePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <PrivateRoute>
                    <ChatPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/votes"
                element={
                  <PrivateRoute>
                    <VotesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/subscriptions"
                element={
                  <PrivateRoute>
                    <PremiumPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <PrivateRoute>
                    <ReportsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/boosts"
                element={
                  <PrivateRoute>
                    <BoostsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/ai"
                element={
                  <PrivateRoute>
                    <AIPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <ProfilePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/billing"
                element={
                  <PrivateRoute>
                    <ProfilePage />
                  </PrivateRoute>
                }
              />

              {/* Admin */}
              <Route
                path="/admin"
                element={
                  <PrivateRoute>
                    <RoleRoute roles={["ADMIN"]}>
                      <AdminPage />
                    </RoleRoute>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <PrivateRoute>
                    <RoleRoute roles={["ADMIN"]}>
                      <UsersPage />
                    </RoleRoute>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/confessions"
                element={
                  <PrivateRoute>
                    <RoleRoute roles={["ADMIN"]}>
                      <AdminConfessionsPage />
                    </RoleRoute>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <PrivateRoute>
                    <RoleRoute roles={["ADMIN"]}>
                      <AdminReportsPage />
                    </RoleRoute>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/subscriptions"
                element={
                  <PrivateRoute>
                    <RoleRoute roles={["ADMIN"]}>
                      <SubscriptionsPage />
                    </RoleRoute>
                  </PrivateRoute>
                }
              />

              {/* 404 */}
              <Route
                path="*"
                element={
                  <div className="page">
                    <div className="card card-soft card-body text-center">
                      <div className="page-title">404</div>
                      <p className="page-subtitle">This page does not exist.</p>
                    </div>
                  </div>
                }
              />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
