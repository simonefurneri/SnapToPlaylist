"use client";

import React, { useState, useRef, useEffect } from "react";
import { ExtractedSong, SpotifyUserProfile } from "@/types";
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
  Zap,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SongListProps {
  songs: ExtractedSong[];
  playlistName: string;
  userProfile?: SpotifyUserProfile | null;
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
  useCache?: boolean;
  onToggleCache?: (enabled: boolean) => void;
  onReset: () => void;
}

export function SongList({
  songs,
  playlistName,
  userProfile,
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
  useCache = true,
  onToggleCache,
  onReset,
}: SongListProps) {
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftPlaylistName, setDraftPlaylistName] = useState(playlistName);
  const [prevPlaylistName, setPrevPlaylistName] = useState(playlistName);
  const titleInputRef = useRef<HTMLInputElement>(null);

  if (playlistName !== prevPlaylistName) {
    setPrevPlaylistName(playlistName);
    setDraftPlaylistName(playlistName);
  }

  // Song item editing state
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editingSongDraft, setEditingSongDraft] = useState<{
    id: string;
    title: string;
    artist: string;
  } | null>(null);

  const foundSongs = songs.filter((s) => s.status === "found");
  const notFoundSongs = songs.filter((s) => s.status === "not_found");
  const pendingSongs = songs.filter((s) => s.status === "pending" || !s.status);

  const hasUncheckedChanges = pendingSongs.length > 0;
  const isFullyChecked = songs.length > 0 && !hasUncheckedChanges;

  const verifiedSongs = songs.filter((s) => s.status === "found" || s.status === "not_found");
  const cachedCount = verifiedSongs.filter((s) => s.fromCache === true).length;
  const liveCount = verifiedSongs.filter((s) => s.fromCache === false).length;

  // Auto-focus title input when edit mode is toggled
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Global ESC key listener to cancel any active editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditingTitle) {
          setDraftPlaylistName(playlistName);
          setIsEditingTitle(false);
        }
        if (editingSongId) {
          setEditingSongId(null);
          setEditingSongDraft(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditingTitle, editingSongId, playlistName]);

  // Start editing a song
  const startEditingSong = (song: ExtractedSong) => {
    setEditingSongId(song.id);
    setEditingSongDraft({
      id: song.id,
      title: song.title,
      artist: song.artist,
    });
  };

  // Commit edited song
  const saveEditedSong = () => {
    if (editingSongDraft && editingSongId) {
      onUpdateSong(editingSongId, {
        title: editingSongDraft.title.trim() || "Senza titolo",
        artist: editingSongDraft.artist.trim(),
      });
    }
    setEditingSongId(null);
    setEditingSongDraft(null);
  };

  // Cancel song editing (ESC)
  const cancelEditedSong = () => {
    setEditingSongId(null);
    setEditingSongDraft(null);
  };

  // Commit playlist title
  const savePlaylistTitle = () => {
    onPlaylistNameChange(draftPlaylistName.trim() || playlistName);
    setIsEditingTitle(false);
  };

  // Cancel playlist title editing (ESC)
  const cancelPlaylistTitle = () => {
    setDraftPlaylistName(playlistName);
    setIsEditingTitle(false);
  };

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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10 w-full min-w-0">
          {/* Title Area */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1DB954] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Nome Playlist
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium flex-shrink-0">
                {songs.length} {songs.length === 1 ? "brano" : "brani"}
              </span>
            </div>

            {/* Editable Title Input */}
            <div className="flex items-center gap-2 w-full min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 w-full min-w-0">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={draftPlaylistName}
                    onChange={(e) => setDraftPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") savePlaylistTitle();
                      if (e.key === "Escape") cancelPlaylistTitle();
                    }}
                    placeholder="Nome della playlist... (ESC per annullare)"
                    className="text-base sm:text-xl font-black bg-neutral-950 border border-[#1DB954] rounded-xl px-3 py-1.5 text-white focus:outline-none w-full min-w-0 shadow-inner"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={savePlaylistTitle}
                    className="p-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold transition-colors cursor-pointer flex-shrink-0"
                    title="Conferma nome (o premi Invio)"
                  >
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  </motion.button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title w-full min-w-0">
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-base sm:text-xl md:text-2xl font-black text-white hover:text-emerald-300 transition-colors cursor-pointer truncate min-w-0 flex-1"
                    title={playlistName || "La mia Playlist Snap"}
                  >
                    {playlistName || "La mia Playlist Snap"}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-[#1DB954] hover:bg-neutral-800/80 transition-colors cursor-pointer flex-shrink-0"
                    title="Modifica nome playlist (ESC per annullare)"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons on top */}
          <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
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
          {!userProfile ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 pt-4 border-t border-neutral-800/80 flex items-center gap-2 text-xs text-amber-300 bg-amber-950/20 p-3 rounded-2xl border border-amber-900/40"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Accesso Spotify richiesto: per verificare i brani ed esportare la playlist è necessario autenticarsi con un account Spotify autorizzato.
              </span>
            </motion.div>
          ) : isFullyChecked ? (
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
          ) : hasUncheckedChanges && songs.length > 0 ? (
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
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* 2. Song List Table */}
      <motion.div
        layout
        className="bg-neutral-900/70 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur"
      >
        {/* Table Header with Cache Toggle & Status Badge */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-950/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
              <span>Elenco Brani ({songs.length})</span>
            </h3>

            {/* Cache Status Badge */}
            {verifiedSongs.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {cachedCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    title={`${cachedCount} brani verificati tramite Cache locale (0 chiamate API)`}
                  >
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                    <span>{cachedCount} Cache</span>
                  </span>
                )}
                {liveCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    title={`${liveCount} brani verificati in tempo reale tramite API Spotify`}
                  >
                    <Globe className="w-3 h-3 text-cyan-400" />
                    <span>{liveCount} Live API</span>
                  </span>
                )}
              </div>
            ) : (
              <span
                className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                  useCache
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                    : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                }`}
                title={
                  useCache
                    ? "Cache attiva: riutilizza i brani già verificati per risparmiare chiamate API"
                    : "Cache disabilitata: eseguirà chiamate live aggiornando la cache"
                }
              >
                {useCache ? (
                  <>
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Cache Attiva</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3 text-neutral-400" />
                    <span>Solo Live API</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Cache Toggle Switch */}
            {onToggleCache && (
              <div
                className={`flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                  useCache
                    ? "bg-neutral-900 border-neutral-700 text-neutral-200"
                    : "bg-neutral-900/60 border-neutral-800 text-neutral-400"
                }`}
                title={
                  useCache
                    ? "Cache attiva (clicca per disabilitare e forzare chiamate live API)"
                    : "Cache disabilitata (clicca per abilitare il riutilizzo dei dati in cache)"
                }
              >
                <div
                  className="flex items-center gap-1 text-[11px] font-semibold select-none cursor-pointer"
                  onClick={() => onToggleCache(!useCache)}
                >
                  <Zap
                    className={`w-3 h-3 transition-colors ${
                      useCache ? "text-amber-400 fill-amber-400/20" : "text-neutral-500"
                    }`}
                  />
                  <span>Cache</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useCache}
                  disabled={isVerifying || isCreating}
                  onClick={() => onToggleCache(!useCache)}
                  className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                    useCache ? "bg-[#1DB954]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-neutral-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                      useCache ? "translate-x-3 sm:translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onAddSong}
              disabled={isVerifying || isCreating}
              className="text-xs font-semibold text-neutral-300 hover:text-[#1DB954] flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aggiungi brano</span>
              <span className="sm:hidden">Aggiungi</span>
            </motion.button>
          </div>
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
                    {isEditing && editingSongDraft ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-1">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">Titolo</label>
                          <input
                            type="text"
                            value={editingSongDraft.title}
                            onChange={(e) =>
                              setEditingSongDraft({
                                ...editingSongDraft,
                                title: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditedSong();
                              if (e.key === "Escape") cancelEditedSong();
                            }}
                            placeholder="Titolo (ESC per annullare)"
                            className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-white focus:outline-none focus:border-[#1DB954] w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">Artista</label>
                          <input
                            type="text"
                            value={editingSongDraft.artist}
                            onChange={(e) =>
                              setEditingSongDraft({
                                ...editingSongDraft,
                                artist: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditedSong();
                              if (e.key === "Escape") cancelEditedSong();
                            }}
                            placeholder="Artista (ESC per annullare)"
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

                          {/* Cache or Live API badge */}
                          {song.fromCache === true && song.status === "found" && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-300 bg-amber-950/50 border border-amber-800/50 px-1.5 py-0.5 rounded-md flex-shrink-0 shadow-sm"
                              title="Recuperato dalla cache locale (0 chiamate API)"
                            >
                              <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400/20" />
                              <span>Cache</span>
                            </span>
                          )}
                          {song.fromCache === false && song.status === "found" && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-cyan-300 bg-cyan-950/50 border border-cyan-800/50 px-1.5 py-0.5 rounded-md flex-shrink-0 shadow-sm"
                              title="Verificato tramite chiamata live API Spotify"
                            >
                              <Globe className="w-2.5 h-2.5 text-cyan-400" />
                              <span>Live</span>
                            </span>
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
                        onClick={saveEditedSong}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 cursor-pointer flex items-center gap-1"
                        title="Salva modifiche (Invio, ESC per annullare)"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Fine</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => startEditingSong(song)}
                        disabled={isVerifying || isCreating}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-30"
                        title="Modifica brano (Invio per salvare, ESC per annullare)"
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
              {!userProfile
                ? "Passo 1: Accedi a Spotify per verificare i brani"
                : hasUncheckedChanges
                ? "Passo 1: Verifica i brani su Spotify"
                : `Passo 2: Pronto per creare la playlist (${foundSongs.length} brani trovati)`}
            </p>
            <p className="text-[11px] text-neutral-500">
              {statusStepText ||
                (!userProfile
                  ? "È necessario connettere un account Spotify autorizzato prima di verificare."
                  : hasUncheckedChanges
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
                !userProfile
                  ? "bg-[#1DB954] hover:bg-[#1ed760] text-neutral-950 shadow-lg shadow-[#1DB954]/20"
                  : !hasUncheckedChanges
                  ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20"
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifica in corso...</span>
                </>
              ) : !userProfile ? (
                <>
                  <Music className="w-4 h-4" />
                  <span>Accedi a Spotify e Verifica</span>
                </>
              ) : !hasUncheckedChanges ? (
                <>
                  <Search className="w-4 h-4" />
                  <span>Rifai Verifica</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Verifica su Spotify</span>
                </>
              )}
            </motion.button>

            {/* Button 2: Create Playlist on Spotify (Disabled until verified and logged in) */}
            <motion.button
              whileHover={!hasUncheckedChanges && foundSongs.length > 0 && !!userProfile ? { scale: 1.03 } : {}}
              whileTap={!hasUncheckedChanges && foundSongs.length > 0 && !!userProfile ? { scale: 0.97 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              type="button"
              disabled={
                isVerifying ||
                isCreating ||
                songs.length === 0 ||
                !userProfile ||
                hasUncheckedChanges ||
                foundSongs.length === 0
              }
              onClick={onRequestCreatePlaylist}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-[#1DB954] via-emerald-500 to-teal-500 hover:from-[#1ed760] hover:to-teal-400 text-neutral-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-[#1DB954]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              title={
                !userProfile
                  ? "Accedi prima a Spotify"
                  : hasUncheckedChanges
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
