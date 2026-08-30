"use client";

import React, { useState, useRef, useEffect } from "react";
import { ExtractedSong } from "@/types";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Edit2,
  Trash2,
  Plus,
  ExternalLink,
  Disc3,
  Sparkles,
  Search,
  Music,
  Check,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SongListProps {
  songs: ExtractedSong[];
  playlistName: string;
  onPlaylistNameChange: (newName: string) => void;
  onUpdateSong: (id: string, updated: Partial<ExtractedSong>) => void;
  onDeleteSong: (id: string) => void;
  onAddSong: () => void;
  onVerifyTracks: () => Promise<void>;
  onRequestCreatePlaylist: () => void;
  isVerifying: boolean;
  isCreating: boolean;
  activeCheckingSongId?: string | null;
  statusStepText?: string;
  onReset: () => void;
}

export function SongList({
  songs,
  playlistName,
  onPlaylistNameChange,
  onUpdateSong,
  onDeleteSong,
  onAddSong,
  onVerifyTracks,
  onRequestCreatePlaylist,
  isVerifying,
  isCreating,
  activeCheckingSongId,
  statusStepText,
  onReset,
}: SongListProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const foundSongs = songs.filter((s) => s.status === "found");
  const notFoundSongs = songs.filter((s) => s.status === "not_found");
  const pendingSongs = songs.filter((s) => s.status === "pending" || !s.status);

  const hasUncheckedChanges = pendingSongs.length > 0;
  const isFullyChecked = songs.length > 0 && !hasUncheckedChanges;

  // Auto-focus title input when edit mode is toggled
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Smooth scroll to follow active checking song
  useEffect(() => {
    if (activeCheckingSongId) {
      const el = document.getElementById(`track-item-${activeCheckingSongId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeCheckingSongId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl mx-auto space-y-5 px-1 sm:px-0"
    >
      {/* 1. Header Card with Title Editor */}
      <motion.div
        layout
        className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 sm:p-7 backdrop-blur shadow-2xl relative overflow-hidden transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1DB954]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
          {/* Title Area */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1DB954] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Nome Playlist
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium">
                {songs.length} {songs.length === 1 ? "brano" : "brani"}
              </span>
            </div>

            {/* Editable Title Input */}
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={playlistName}
                    onChange={(e) => onPlaylistNameChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setIsEditingTitle(false);
                    }}
                    placeholder="Nome della playlist..."
                    className="text-lg sm:text-2xl font-black bg-neutral-950 border border-[#1DB954] rounded-xl px-3 py-1.5 text-white focus:outline-none w-full shadow-inner"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="p-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold transition-colors cursor-pointer flex-shrink-0"
                    title="Conferma nome"
                  >
                    <Check className="w-5 h-5" />
                  </motion.button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 group/title w-full">
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-lg sm:text-2xl font-black text-white hover:text-emerald-300 transition-colors cursor-pointer truncate max-w-full"
                    title="Clicca per modificare il nome"
                  >
                    {playlistName || "La mia Playlist Snap"}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-[#1DB954] hover:bg-neutral-800/80 transition-colors cursor-pointer flex-shrink-0"
                    title="Modifica nome playlist"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons on top */}
          <div className="flex items-center gap-2 flex-shrink-0 self-start">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onReset}
              disabled={isVerifying || isCreating}
              className="text-xs font-semibold text-neutral-300 hover:text-white px-3.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/50 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nuovo Screenshot</span>
            </motion.button>
          </div>
        </div>

        {/* Status Summary Banner */}
        <AnimatePresence>
          {isFullyChecked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {foundSongs.length} trovati su Spotify
                </span>
                {notFoundSongs.length > 0 && (
                  <span className="text-rose-400 font-semibold flex items-center gap-1.5 pl-3 border-l border-neutral-800">
                    <XCircle className="w-4 h-4" />
                    {notFoundSongs.length} non trovati
                  </span>
                )}
              </div>

              <span className="text-neutral-400 text-[11px]">
                Puoi modificare i titoli e cliccare nuovamente su &quot;Verifica su Spotify&quot;.
              </span>
            </motion.div>
          )}

          {hasUncheckedChanges && songs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 pt-4 border-t border-neutral-800/80 flex items-center gap-2 text-xs text-amber-400"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                {pendingSongs.length === songs.length
                  ? "Clicca su 'Verifica su Spotify' per controllare la disponibilità dei brani prima di creare la playlist."
                  : "Hai modifiche non ancora verificate. Rifai la verifica per abilitare la creazione della playlist."}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 2. Song List Table */}
      <motion.div
        layout
        className="bg-neutral-900/70 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur"
      >
        {/* Table Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Elenco Brani ({songs.length})</span>
          </h3>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onAddSong}
            disabled={isVerifying || isCreating}
            className="text-xs font-semibold text-neutral-300 hover:text-[#1DB954] flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi brano</span>
          </motion.button>
        </div>

        {/* Songs List Items */}
        <div className="divide-y divide-neutral-800/60 max-h-[60vh] overflow-y-auto">
          <AnimatePresence initial={false}>
            {songs.map((song, index) => {
              const isEditing = editingSongId === song.id;
              const isCurrentlyChecking = activeCheckingSongId === song.id;

              return (
                <motion.div
                  key={song.id}
                  id={`track-item-${song.id}`}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3.5 sm:px-6 flex items-center justify-between gap-3 transition-colors duration-200 group ${
                    isCurrentlyChecking
                      ? "bg-cyan-950/30 border-l-4 border-cyan-400"
                      : song.status === "found"
                      ? "bg-[#1DB954]/5 hover:bg-[#1DB954]/10 border-l-4 border-emerald-500/80"
                      : song.status === "not_found"
                      ? "bg-rose-950/15 hover:bg-rose-950/25 border-l-4 border-rose-500/80"
                      : "hover:bg-neutral-800/40 border-l-4 border-transparent"
                  }`}
                >
                  {/* Left: Status Icon & Album Cover Art */}
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
                    {/* Status Indicator Badge */}
                    <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8">
                      {song.status === "searching" || isCurrentlyChecking ? (
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      ) : song.status === "found" ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="group/tip relative flex items-center justify-center cursor-pointer"
                          title="Trovata su Spotify"
                        >
                          <CheckCircle2 className="w-6 h-6 text-[#1DB954] drop-shadow-[0_0_8px_rgba(29,185,84,0.4)]" />
                        </motion.div>
                      ) : song.status === "not_found" ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="group/tip relative flex items-center justify-center cursor-pointer"
                          title="Canzone non trovata su Spotify"
                        >
                          <XCircle className="w-6 h-6 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                        </motion.div>
                      ) : (
                        <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-neutral-800/80 text-neutral-400 font-mono text-xs font-semibold">
                          {index + 1}
                        </div>
                      )}
                    </div>

                    {/* Album Cover Thumbnail */}
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-950 border border-neutral-800 shadow-sm flex items-center justify-center">
                      {song.spotifyAlbumCover ? (
                        <img
                          src={song.spotifyAlbumCover}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Disc3 className="w-5 h-5 text-neutral-600" />
                      )}

                      {/* Small status overlay icon on album cover */}
                      {song.status === "found" && (
                        <div className="absolute bottom-0 right-0 bg-neutral-950/90 rounded-tl-md p-0.5">
                          <CheckCircle2 className="w-3 h-3 text-[#1DB954]" />
                        </div>
                      )}
                      {song.status === "not_found" && (
                        <div className="absolute bottom-0 right-0 bg-neutral-950/90 rounded-tl-md p-0.5">
                          <XCircle className="w-3 h-3 text-rose-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Title & Artist / Edit Inputs */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-1">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">Titolo</label>
                          <input
                            type="text"
                            value={song.title}
                            onChange={(e) =>
                              onUpdateSong(song.id, { title: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingSongId(null);
                            }}
                            placeholder="Titolo"
                            className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-white focus:outline-none focus:border-[#1DB954] w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">Artista</label>
                          <input
                            type="text"
                            value={song.artist}
                            onChange={(e) =>
                              onUpdateSong(song.id, { artist: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingSongId(null);
                            }}
                            placeholder="Artista"
                            className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-white focus:outline-none focus:border-[#1DB954] w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              song.status === "not_found"
                                ? "text-neutral-400 line-through decoration-rose-500/60"
                                : "text-white"
                            }`}
                          >
                            {song.title}
                          </h4>
                          {song.spotifyTrackUrl && (
                            <a
                              href={song.spotifyTrackUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neutral-500 hover:text-[#1DB954] transition-colors cursor-pointer flex-shrink-0"
                              title="Apri traccia su Spotify"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <p className="text-[11px] sm:text-xs text-neutral-400 truncate">
                          <span className="text-neutral-300 font-medium">
                            {song.artist || "Artista non specificato"}
                          </span>
                          {song.album && (
                            <span className="text-neutral-500 hidden sm:inline">
                              {" "}
                              • {song.album}
                            </span>
                          )}
                        </p>

                        {/* Not found explanation label */}
                        {song.status === "not_found" && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-medium bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-900/50 mt-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Canzone non trovata su Spotify
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    {isEditing ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setEditingSongId(null)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Fine</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => setEditingSongId(song.id)}
                        disabled={isVerifying || isCreating}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-30"
                        title="Modifica brano (Invio per salvare)"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => onDeleteSong(song.id)}
                      disabled={isVerifying || isCreating}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-30"
                      title="Rimuovi brano"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 3. Bottom Actions: Step 1 (Verify) & Step 2 (Create) */}
        <div className="p-4 sm:p-6 bg-neutral-950/90 border-t border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="text-xs text-neutral-400 text-center sm:text-left space-y-0.5">
            <p className="font-semibold text-neutral-200">
              {hasUncheckedChanges
                ? "Passo 1: Verifica i brani su Spotify"
                : `Passo 2: Pronto per creare la playlist (${foundSongs.length} brani trovati)`}
            </p>
            <p className="text-[11px] text-neutral-500">
              {statusStepText ||
                (hasUncheckedChanges
                  ? "Verifica i brani per sbloccare la creazione della playlist."
                  : "Clicca su Crea Playlist per visualizzare il riepilogo e confermare.")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Button 1: Verify on Spotify */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              type="button"
              disabled={isVerifying || isCreating || songs.length === 0}
              onClick={onVerifyTracks}
              className={`py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                !hasUncheckedChanges
                  ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20"
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifica in corso...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>
                    {!hasUncheckedChanges ? "Rifai Verifica" : "Verifica su Spotify"}
                  </span>
                </>
              )}
            </motion.button>

            {/* Button 2: Create Playlist on Spotify (Disabled until verified) */}
            <motion.button
              whileHover={!hasUncheckedChanges && foundSongs.length > 0 ? { scale: 1.03 } : {}}
              whileTap={!hasUncheckedChanges && foundSongs.length > 0 ? { scale: 0.97 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              type="button"
              disabled={
                isVerifying ||
                isCreating ||
                songs.length === 0 ||
                hasUncheckedChanges ||
                foundSongs.length === 0
              }
              onClick={onRequestCreatePlaylist}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-[#1DB954] via-emerald-500 to-teal-500 hover:from-[#1ed760] hover:to-teal-400 text-neutral-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-[#1DB954]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              title={
                hasUncheckedChanges
                  ? "Esegui prima la verifica dei brani"
                  : "Crea la playlist su Spotify"
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creazione in corso...</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4 fill-neutral-950" />
                  <span>
                    Crea Playlist {foundSongs.length > 0 ? `(${foundSongs.length})` : ""}
                  </span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
