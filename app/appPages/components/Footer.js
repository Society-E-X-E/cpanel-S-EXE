"use client";

import { useEffect, useState } from "react";

export default function Footer() {
  const [year, setYear] = useState("2026");

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <footer
      style={{
        marginTop: "2rem",
        textAlign: "center",
        color: "#9ce8df",
        fontSize: "0.85rem",
        borderTop: "1px solid rgba(75, 229, 207, 0.25)",
        paddingTop: "1rem"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1.2rem",
          marginBottom: "0.5rem"
        }}
      >
        <a
          href="https://github.com/ahidroidev"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#b8fff7", textDecoration: "none" }}
          aria-label="GitHub"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0.297C5.37 0.297 0 5.667 0 12.297c0 5.286 3.438 9.764 8.205 11.346.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.744.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.303-5.466-1.333-5.466-5.93 0-1.31.469-2.38 1.236-3.22-.124-.303-.536-1.524.116-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.004 2.048.138 3.004.404 2.29-1.553 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.804 5.625-5.475 5.92.43.37.813 1.1.813 2.22 0 1.604-.015 2.896-.015 3.286 0 .32.218.694.825.576C20.565 22.057 24 17.577 24 12.296 24 5.667 18.632.297 12 .297z" />
          </svg>
        </a>
        <a
          href="https://twitter.com/programameste"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#b8fff7", textDecoration: "none" }}
          aria-label="Twitter"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4.557a9.83 9.83 0 0 1-2.828.775 4.93 4.93 0 0 0 2.165-2.724 9.864 9.864 0 0 1-3.127 1.195 4.916 4.916 0 0 0-8.384 4.482A13.94 13.94 0 0 1 1.671 3.149a4.912 4.912 0 0 0 1.523 6.556A4.902 4.902 0 0 1 .964 9.1v.062a4.916 4.916 0 0 0 3.946 4.817 4.904 4.904 0 0 1-2.212.084 4.918 4.918 0 0 0 4.59 3.417A9.868 9.868 0 0 1 0 19.54a13.94 13.94 0 0 0 7.548 2.212c9.058 0 14.01-7.507 14.01-14.01 0-.213-.004-.425-.014-.636A10.01 10.01 0 0 0 24 4.557z" />
          </svg>
        </a>
        <a
          href="https://www.linkedin.com/in/ahidroid"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#b8fff7", textDecoration: "none" }}
          aria-label="LinkedIn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.23 0H1.77C.792 0 0 .774 0 1.727v20.545C0 23.226.792 24 1.77 24h20.46c.978 0 1.77-.774 1.77-1.727V1.727C24 .774 23.208 0 22.23 0zM7.12 20.452H3.56V9h3.56v11.452zM5.34 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM20.452 20.452h-3.558v-5.569c0-1.328-.026-3.036-1.852-3.036-1.853 0-2.136 1.446-2.136 2.941v5.664h-3.558V9h3.418v1.561h.049c.477-.902 1.639-1.853 3.373-1.853 3.605 0 4.27 2.373 4.27 5.456v6.288z" />
          </svg>
        </a>
      </div>
      <div>© {year} Society . E X E | Dashboard Scam Pro V - 3.0.1 | 
        <a
          href="https://t.me/devcrackpy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#034d50", textDecoration: "none" }}
          aria-label="LinkedIn"
        >Devcrackpy</a>
    </div>
    </footer>
  );
}
