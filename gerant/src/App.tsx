import { useState, useEffect } from "react";
import { GerantLogin } from "./components/auth/GerantLogin";
import { GerantDashboard } from "./components/gerant/GerantDashboard";
import { ToastProvider } from "./components/ui/Toast";
import { User } from "./types";
import { apiGet } from "./lib/apiClient";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("satouba_gerant_token");
    const savedUser = localStorage.getItem("satouba_gerant_user");
    if (!savedToken || !savedUser) {
      setLoading(false);
      return;
    }

    // Verify session with server before trusting localStorage
    apiGet<User>("/api/auth/me")
      .then((serverUser) => {
        if (serverUser.role === "ADMIN") {
          setUser(serverUser);
          // Sync localStorage with server truth
          localStorage.setItem("satouba_gerant_user", JSON.stringify(serverUser));
        } else {
          localStorage.removeItem("satouba_gerant_token");
          localStorage.removeItem("satouba_gerant_user");
        }
      })
      .catch(() => {
        localStorage.removeItem("satouba_gerant_token");
        localStorage.removeItem("satouba_gerant_user");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (loggedInUser: User, _token: string) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("satouba_gerant_token");
    localStorage.removeItem("satouba_gerant_user");
    setUser(null);
  };

  if (loading) {
    return (
      <ToastProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B5D1E]" />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      {!user || user.role !== "ADMIN" ? (
        <GerantLogin onLogin={handleLogin} />
      ) : (
        <GerantDashboard onLogout={handleLogout} />
      )}
    </ToastProvider>
  );
}