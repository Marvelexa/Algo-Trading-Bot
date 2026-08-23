import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StockAnalysis } from "./pages/StockAnalysis";
import { LoginPage } from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#070a12] flex flex-col items-center justify-center gap-3 text-slate-300 font-sans">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider text-slate-400">CONNECTING TO TERMINAL SERVER...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex flex-col font-sans">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <StockAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock"
              element={
                <ProtectedRoute>
                  <StockAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/:ticker"
              element={
                <ProtectedRoute>
                  <StockAnalysis />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
