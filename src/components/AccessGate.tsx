"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, KeyRound, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AccessGateProps {
  onUnlock: () => void;
}

export function AccessGate({ onUnlock }: AccessGateProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Inserisci la password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onUnlock();
      } else {
        setError(data.error || "Password non corretta. Riprova.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError("Errore di connessione durante la verifica.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={
          shake
            ? {
                opacity: 1,
                scale: 1,
                y: 0,
                x: [-10, 10, -8, 8, -4, 4, 0],
              }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={
          shake
            ? { duration: 0.45 }
            : { type: "spring", damping: 25, stiffness: 320 }
        }
        className="bg-neutral-900/90 border border-neutral-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl backdrop-blur relative z-10 text-center"
      >
        {/* App Logo */}
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-[#1DB954]/20 mx-auto mb-5 border border-neutral-800">
          <Image
            src="/logo.svg"
            alt="SnapToPlaylist Logo"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700 text-[11px] font-semibold text-neutral-300 mb-1">
            <Lock className="w-3 h-3 text-[#1DB954]" />
            <span>Accesso Riservato</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            SnapToPlaylist
          </h2>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
            Inserisci la password di accesso per sbloccare l&apos;applicazione.
          </p>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-3 rounded-xl bg-rose-950/50 border border-rose-900/60 text-rose-300 text-xs font-semibold"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Inserisci password..."
              autoFocus
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-neutral-500 outline-none transition duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#1DB954] via-emerald-500 to-teal-500 hover:from-[#1ed760] hover:to-teal-400 text-neutral-950 font-extrabold text-sm shadow-xl shadow-[#1DB954]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifica in corso...</span>
              </>
            ) : (
              <>
                <span>Accedi all&apos;App</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sessione protetta con crittografia SHA-256</span>
        </div>
      </motion.div>
    </div>
  );
}
