"use client";

import React from "react";
import {
  X,
  AlertTriangle,
  RefreshCw,
  Info,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SpotifyRateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export function SpotifyRateLimitModal({
  isOpen,
  onClose,
  onRetry,
}: SpotifyRateLimitModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 340,
              mass: 0.8,
            }}
            className="bg-neutral-900/95 border border-amber-500/40 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative text-white overflow-hidden z-10"
          >
            {/* Ambient Amber Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0"
              >
                <ShieldAlert className="w-6 h-6 text-amber-400" />
              </motion.div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                  <AlertTriangle className="w-3 h-3" /> Errore 429 Too Many Requests
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Limite Richieste Spotify Raggiunto
                </h3>
              </div>
            </div>

            {/* Explanation & Context */}
            <div className="space-y-3.5 mb-6 text-xs sm:text-sm text-neutral-300">
              <p className="leading-relaxed text-neutral-300">
                L&apos;API di ricerca di <strong className="text-white">Spotify</strong> ha temporaneamente limitato le richieste per prevenire un carico eccessivo (Rate Limit).
              </p>
              
              <div className="bg-amber-950/40 border border-amber-900/60 rounded-2xl p-4 text-xs text-amber-200/90 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 leading-relaxed">
                  <p className="font-bold text-amber-300">
                    Ricerca successiva interrotta automaticamente
                  </p>
                  <p className="text-neutral-300 text-[11px] sm:text-xs">
                    Per evitare ulteriori blocchi da parte di Spotify, la verifica delle canzoni successive è stata sospesa. I brani già verificati in precedenza sono rimasti salvati.
                  </p>
                  <p className="text-neutral-400 text-[11px] pt-1">
                    Ti consigliamo di attendere qualche istante prima di riprovare la verifica.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                type="button"
                onClick={onClose}
                className="order-2 sm:order-1 flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Chiudi
              </motion.button>

              {onRetry && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  type="button"
                  onClick={() => {
                    onClose();
                    onRetry();
                  }}
                  className="order-1 sm:order-2 flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#1DB954] hover:from-emerald-400 hover:to-[#1ed760] text-neutral-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-neutral-950" />
                  <span>Riprova Verifica</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
