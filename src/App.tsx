// UPDATED App.tsx (simplified core upgrades applied)
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import "./index.css";

const Skeleton = ({ className }) => (
  <div className={"animate-pulse bg-gray-200 rounded-lg " + className} />
);

export default function App() {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="flex h-screen dynamic-bg relative overflow-hidden">

      {/* Cursor Glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(600px at ${mouse.x}px ${mouse.y}px, rgba(0,74,198,0.08), transparent 80%)`
        }}
      />

      {/* Sidebar */}
      <aside className="w-64 glass-strong premium-shadow p-4 space-y-2">
        {["dashboard", "patients"].map((item) => (
          <button
            key={item}
            onClick={() => setPage(item)}
            className="relative w-full px-4 py-2 rounded-lg text-left"
          >
            {page === item && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-blue-100 rounded-lg"
              />
            )}
            <span className="relative z-10 capitalize">{item}</span>
          </button>
        ))}
      </aside>

      {/* Content */}
      <div className="flex-1 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="glass p-6 rounded-2xl premium-shadow">
                <h1 className="h2">Premium Dashboard</h1>
                <p className="body mt-2">Everything is now production ready.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
