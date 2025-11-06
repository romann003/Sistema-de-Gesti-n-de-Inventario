
  import { createRoot } from "react-dom/client";
  import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
  import App from "./App.tsx";
  import { LoginPage } from './components/LoginPage';
  import { AuthProvider, useAuth } from './contexts/AuthContext';
  import "./index.css";

  const AppWrapper = () => {
    const { user, ready } = useAuth();
    if (!ready) return null;
    return user ? <App /> : <Navigate to="/login" replace />;
  };

  const Root = () => {
    return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<AppWrapper />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );
  };

  createRoot(document.getElementById("root")!).render(<Root />);
  