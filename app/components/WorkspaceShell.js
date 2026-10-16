"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABELS, canManageUsers } from "../../lib/panelAuth";

function initials(username) {
  return String(username || "S").slice(0, 2).toUpperCase();
}

function UserAvatar({ user, className = "avatar" }) {
  return (
    <div className={className}>
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        : initials(user?.username)}
    </div>
  );
}

export default function WorkspaceShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then(async (response) => {
        if (!response.ok) {
          router.replace("/");
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch((error) => {
        console.error("Session check failed:", error);
        if (!cancelled) router.replace("/");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not close the session");
      router.replace("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  if (loading) return <main className="loading-view">Preparando tu espacio de trabajo...</main>;
  if (!user) return null;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "fa-solid fa-chart-pie" },
    { href: "/profile", label: "Mi perfil", icon: "fa-regular fa-user" },
    ...(canManageUsers(user.role) ? [{ href: "/team", label: "Equipo", icon: "fa-solid fa-users" }] : []),
  ];

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-lockup">
            <span className="brand-mark">.EXE</span>
            <span className="brand-name">Society . E X E</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          <p className="sidebar-label">Workspace</p>
          {navItems.map((item) => (
            <Link
              className={`nav-link${pathname === item.href ? " active" : ""}`}
              href={item.href}
              key={item.href}
              aria-label={item.label}
            >
              <i className={item.icon} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <UserAvatar user={user} />
            <div className="profile-mini">
              <strong>{user.username}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
          <button className="button-secondary logout-button" type="button" onClick={logout} aria-label="Cerrar sesión">
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <span className="topbar-crumb">Society . E X E <span aria-hidden="true">/</span> {navItems.find((item) => item.href === pathname)?.label || "Workspace"}</span>
          <span className="topbar-user">{ROLE_LABELS[user.role]}</span>
        </header>
        <main className="content">{typeof children === "function" ? children(user) : children}</main>
      </div>
    </div>
  );
}

export { UserAvatar };
