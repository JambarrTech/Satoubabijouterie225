import { useState, useEffect } from "react";
import { GerantLogin } from "./components/auth/GerantLogin";
import { GerantDashboard } from "./components/gerant/GerantDashboard";
import { ToastProvider } from "./components/ui/Toast";
import { User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("satouba_gerant_token");
    const savedUser = localStorage.getItem("satouba_gerant_user");
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        if (parsedUser.role === "ADMIN") {
          setUser(parsedUser);
        }
      } catch {
        localStorage.removeItem("satouba_gerant_token");
        localStorage.removeItem("satouba_gerant_user");
      }
    }
  }, []);

  const handleLogin = (loggedInUser: User, _token: string) => {
    setUser(loggedInUser);
  };

  const handleSwitchToClient = () => {
    window.location.href = "/";
  };

  if (!user || user.role !== "ADMIN") {
    return (
      <ToastProvider>
        <GerantLogin onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <GerantDashboard onSwitchToClient={handleSwitchToClient} />
    </ToastProvider>
  );
}