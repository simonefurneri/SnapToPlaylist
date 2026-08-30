"use client";

import React from "react";
import { ExtractedSong } from "@/types";
import {
  X,
  Music,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Disc3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreatePlaylistConfirmModalProps {
  isOpen: boolean;
  playlistName: string;
  songs: ExtractedSong[];
  isCreating: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function CreatePlaylistConfirmModal({
  isOpen,
  playlistName,
  songs,
  isCreating,
  onConfirm,
  onClose,
}: CreatePlaylistConfirmModalProps) {
  const foundSongs = songs.filter((s) => s.status === "found");
  const notFoundSongs = songs.filter((s) => s.status === "not_found");

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
            onClick={() => {
              if (!isCreating) onClose();
            }}
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
            className="bg-neutral-900/95 border border-neutral-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative text-white overflow-hidden z-10"
          >
            {/* Ambient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#1DB954]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-12 h-12 rounded-2xl bg-[#1DB954]/10 border border-[#1DB954]/30 text-[#1DB954] flex items-center justify-center shadow-lg shadow-[#1DB954]/20 flex-shrink-0"
              >
                <Music className="w-6 h-6" />
              </motion.div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Conferma Creazione Playlist
                </h3>
                <p className="text-xs text-neutral-400">
                  Riepilogo delle tracce che verranno create su Spotify
                </p>
              </div>
            </div>

            {/* Playlist Name Summary */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 mb-4">
              <div className="text-[11px] font-bold text-[#1DB954] uppercase tracking-wider mb-1">
                Nome Playlist
              </div>
              <div className="text-base sm:text-lg font-extrabold text-white truncate">
                {playlistName || "La mia Playlist Snap"}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400 pt-2 border-t border-neutral-850">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {foundSongs.length} brani da inserire
                </span>
                {notFoundSongs.length > 0 && (
                  <span className="text-rose-400 font-semibold flex items-center gap-1 pl-3 border-l border-neutral-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {notFoundSongs.length} esclusi
                  </span>
                )}
              </div>
            </div>

            {/* Tracks Preview Scroll */}
            <div className="space-y-1.5 mb-6 max-h-44 overflow-y-auto pr-1">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Brani inclusi ({foundSongs.length}):
              </div>
              {foundSongs.map((song, i) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-950/50 border border-neutral-850 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {song.spotifyAlbumCover ? (
                      <img
                        src={song.spotifyAlbumCover}
                        alt={song.title}
                        className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                      />
                    ) : (
                      <Disc3 className="w-7 h-7 text-neutral-600 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-neutral-200 truncate">
                        {song.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        {song.spotifyArtistName || song.artist}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 flex-shrink-0">
                    #{i + 1}
                  </span>
                </div>
              ))}

              {notFoundSongs.length > 0 && (
                <div className="pt-3">
                  <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Brani esclusi ({notFoundSongs.length}):
                  </div>
                  <div className="space-y-1">
                    {notFoundSongs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300"
                      >
                        <span className="truncate">{song.title} - {song.artist}</span>
                        <span className="text-[10px] text-rose-400 font-medium">Non trovato</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                type="button"
                disabled={isCreating}
                onClick={onClose}
                className="order-2 sm:order-1 flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Annulla e Modifica
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                type="button"
                disabled={isCreating || foundSongs.length === 0}
                onClick={onConfirm}
                className="order-1 sm:order-2 flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-[#1DB954] to-emerald-500 hover:from-[#1ed760] hover:to-emerald-400 text-neutral-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-[#1DB954]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creazione in corso...</span>
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4 fill-neutral-950" />
                    <span>Conferma e Crea Playlist</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
