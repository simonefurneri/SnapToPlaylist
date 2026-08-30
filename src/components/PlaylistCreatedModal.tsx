"use client";

import React, { useEffect, useState } from "react";
import { CreatedPlaylistResult } from "@/types";
import {
  CheckCircle2,
  ExternalLink,
  X,
  Share2,
  ListMusic,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface PlaylistCreatedModalProps {
  result: CreatedPlaylistResult | null;
  onClose: () => void;
}

export function PlaylistCreatedModal({
  result,
  onClose,
}: PlaylistCreatedModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (result) {
      try {
        const timeout = setTimeout(() => {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#1DB954", "#22c55e", "#ffffff", "#38bdf8", "#a855f7"],
          });
        }, 150);
        return () => clearTimeout(timeout);
      } catch {
        // ignore
      }
    }
  }, [result]);

  const spotifyUrl = result?.external_urls?.spotify;

  const handleCopyLink = () => {
    if (spotifyUrl) {
      navigator.clipboard.writeText(spotifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
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
            className="bg-neutral-900/95 border border-neutral-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-center text-white overflow-hidden z-10"
          >
            {/* Ambient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-56 h-56 bg-[#1DB954]/20 rounded-full blur-3xl pointer-events-none" />

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* Checkmark Icon with Spring Pop */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                damping: 18,
                stiffness: 300,
                delay: 0.1,
              }}
              className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[#1DB954] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#1DB954]/25"
            >
              <CheckCircle2 className="w-9 h-9" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight">
                Playlist Creata con Successo!
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 mb-6">
                La playlist è pronta e disponibile nel tuo account Spotify.
              </p>
            </motion.div>

            {/* Playlist Card Preview */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 text-left mb-6 flex items-center gap-4 shadow-inner"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 text-white shadow">
                <ListMusic className="w-7 h-7 text-[#1DB954]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {result.name}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  <span className="text-[#1DB954] font-bold">
                    {result.totalTracksAdded}
                  </span>{" "}
                  di {result.totalTracksRequested} brani inseriti
                </p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="space-y-2.5"
            >
              {spotifyUrl && (
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  href={spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1DB954] to-emerald-400 hover:from-[#1ed760] hover:to-emerald-300 text-black font-extrabold text-sm shadow-lg shadow-[#1DB954]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Apri su Spotify</span>
                  <ExternalLink className="w-4 h-4" />
                </motion.a>
              )}

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Link Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copia Link</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Chiudi
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
