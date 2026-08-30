"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ExtractedSong,
  GeminiExtractionResponse,
  SpotifyUserProfile,
  CreatedPlaylistResult,
} from "@/types";
import {
  getStoredAccessToken,
  fetchCurrentUserProfile,
  logoutSpotify,
  initiateSpotifyAuth,
  searchSpotifyTrack,
  createPlaylistAndAddTracks,
  getAndClearPendingPlaylistAction,
  getSpotifyClientId,
  SpotifyRateLimitError,
} from "@/lib/spotify";
import { Navbar } from "@/components/Navbar";
import { ImageUploader } from "@/components/ImageUploader";
import { SongList } from "@/components/SongList";
import { AccessGate } from "@/components/AccessGate";
import { CreatePlaylistConfirmModal } from "@/components/CreatePlaylistConfirmModal";
import { PlaylistCreatedModal } from "@/components/PlaylistCreatedModal";
import { SpotifyRateLimitModal } from "@/components/SpotifyRateLimitModal";
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Music,
  ShieldCheck,
  Zap,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function MainAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Access Gate Protection State
  const [isAccessChecking, setIsAccessChecking] = useState(true);
  const [isAccessGranted, setIsAccessGranted] = useState(true);

  const [initialPending] = useState(() => {
    if (typeof window !== "undefined" && searchParams.get("spotify_auth")) {
      return getAndClearPendingPlaylistAction();
    }
    return null;
  });

  // App State
  const [songs, setSongs] = useState<ExtractedSong[]>(
    () => initialPending?.songs || []
  );
  const [playlistName, setPlaylistName] = useState<string>(
    () => initialPending?.playlistName || ""
  );
  const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(null);

  // Status & Progress
  const [isExtracting, setIsExtracting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeCheckingSongId, setActiveCheckingSongId] = useState<string | null>(
    null
  );
  const [statusStepText, setStatusStepText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const err = searchParams.get("error");
    return err ? decodeURIComponent(err) : null;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    return searchParams.get("spotify_auth")
      ? "Login Spotify effettuato con successo!"
      : null;
  });

  // Modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(
    () => !!initialPending?.autoCreateAfterAuth
  );
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);
  const [createdPlaylistResult, setCreatedPlaylistResult] =
    useState<CreatedPlaylistResult | null>(null);

  // 1. Initial Mount & Auth Check
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const res = await fetch("/api/auth/check");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setIsAccessGranted(!data.isProtected || data.isAuthorized);
        } else {
          if (isMounted) setIsAccessGranted(true);
        }
      } catch {
        if (isMounted) setIsAccessGranted(true);
      } finally {
        if (isMounted) setIsAccessChecking(false);
      }

      const token = getStoredAccessToken();
      if (token) {
        try {
          const profile = await fetchCurrentUserProfile(token);
          if (isMounted) setUserProfile(profile);
        } catch (err: unknown) {
          console.warn("Errore sessione Spotify:", err);
          if (isMounted) setUserProfile(null);
        }
      }
    };

    initialize();

    if (searchParams.get("spotify_auth")) {
      router.replace("/");
    }

    return () => {
      isMounted = false;
    };
  }, [searchParams, router]);

  // 2. Auto-dismiss success notification banner after 4 seconds
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // 4. Gemini Vision Extraction
  const handleAnalyzeImage = async (
    fileOrBase64: File | string,
    mimeType: string = "image/jpeg"
  ) => {
    setIsExtracting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let response: Response;

      if (typeof fileOrBase64 === "string") {
        response = await fetch("/api/extract-songs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: fileOrBase64,
            mimeType: mimeType,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("image", fileOrBase64);

        response = await fetch("/api/extract-songs", {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore durante l'analisi dell'immagine.");
      }

      const extractionData = data as GeminiExtractionResponse;

      if (!extractionData.songs || extractionData.songs.length === 0) {
        throw new Error(
          "Nessun brano musicale riconosciuto. Assicurati che lo screenshot contenga titoli di canzoni leggibili."
        );
      }

      const formattedSongs: ExtractedSong[] = extractionData.songs.map(
        (song, index) => ({
          id: `song-${Date.now()}-${index}`,
          title: song.title,
          artist: song.artist,
          album: song.album,
          status: "pending",
        })
      );

      setPlaylistName(
        extractionData.suggestedPlaylistName || "La mia Playlist Snap"
      );
      setSongs(formattedSongs);
      setSuccessMessage(
        `Estratte con successo ${formattedSongs.length} canzoni con Gemini Vision!`
      );
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(
        error.message || "Si è verificato un errore durante l'analisi dell'immagine."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  // 5. Update, Delete, Add song
  const handleUpdateSong = (id: string, updated: Partial<ExtractedSong>) => {
    setSongs((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              ...updated,
              status: "pending",
              spotifyUri: undefined,
              spotifyTrackName: undefined,
              spotifyArtistName: undefined,
              spotifyAlbumCover: undefined,
              spotifyTrackUrl: undefined,
              spotifyPreviewUrl: undefined,
            }
          : s
      )
    );
  };

  const handleDeleteSong = (id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSong = () => {
    const newSong: ExtractedSong = {
      id: `song-${Date.now()}-${songs.length}`,
      title: "Nuovo Titolo",
      artist: "Artista",
      status: "pending",
    };
    setSongs((prev) => [...prev, newSong]);
  };

  // 6. Step 1: Verify Spotify Matches
  const handleVerifySpotifyTracks = async (forceAll: boolean = false) => {
    if (songs.length === 0) return;

    const token = getStoredAccessToken();

    // If not authenticated, trigger login first
    if (!token) {
      const clientId = getSpotifyClientId();
      if (!clientId) {
        setErrorMessage(
          "NEXT_PUBLIC_SPOTIFY_CLIENT_ID non configurato nelle variabili d'ambiente."
        );
        return;
      }
      await initiateSpotifyAuth({
        playlistName,
        songs,
        autoCreateAfterAuth: false,
      });
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    const updatedSongs: ExtractedSong[] = [...songs];

    try {
      for (let i = 0; i < updatedSongs.length; i++) {
        const song = updatedSongs[i];

        // If already found and not forced, skip searching again to preserve quota
        if (!forceAll && song.status === "found" && song.spotifyUri) {
          continue;
        }

        setActiveCheckingSongId(song.id);
        setStatusStepText(`Verifica (${i + 1}/${updatedSongs.length}): "${song.title}"...`);

        updatedSongs[i] = { ...song, status: "searching" };
        setSongs([...updatedSongs]);

        try {
          const match = await searchSpotifyTrack(token, song.title, song.artist);
          if (match.found && match.spotifyUri) {
            updatedSongs[i] = {
              ...song,
              status: "found",
              spotifyUri: match.spotifyUri,
              spotifyTrackName: match.spotifyTrackName,
              spotifyArtistName: match.spotifyArtistName,
              spotifyAlbumCover: match.spotifyAlbumCover,
              spotifyTrackUrl: match.spotifyTrackUrl,
              spotifyPreviewUrl: match.spotifyPreviewUrl,
            };
          } else {
            updatedSongs[i] = {
              ...song,
              status: "not_found",
              spotifyUri: undefined,
              spotifyAlbumCover: undefined,
            };
          }
        } catch (songErr: unknown) {
          // Rate limit error: immediately halt searching subsequent songs
          if (
            songErr instanceof SpotifyRateLimitError ||
            (songErr as Error)?.name === "SpotifyRateLimitError"
          ) {
            const retrySec = (songErr as SpotifyRateLimitError).retryAfter || null;

            // Reset current track and any other tracks currently in searching state back to pending
            for (let k = 0; k < updatedSongs.length; k++) {
              if (updatedSongs[k].status === "searching") {
                updatedSongs[k] = { ...updatedSongs[k], status: "pending" };
              }
            }
            setSongs([...updatedSongs]);

            // Open Rate Limit modal on first occurrence
            setRateLimitRetryAfter(retrySec);
            setIsRateLimitModalOpen(true);

            setErrorMessage(
              `Limite di richieste Spotify raggiunto (Rate Limit 429). Ricerca interrotta per i brani successivi.${
                retrySec ? ` Attendi circa ${retrySec}s prima di riprovare.` : ""
              }`
            );
            setStatusStepText(
              `Verifica interrotta per Rate Limit Spotify al brano ${i + 1}/${updatedSongs.length}.`
            );

            // Block subsequent song searches
            break;
          }

          if ((songErr as Error)?.message?.includes("Sessione Spotify scaduta")) {
            logoutSpotify();
            setUserProfile(null);
            setErrorMessage("Sessione Spotify scaduta. Effettua nuovamente il login.");
            break;
          }

          // Generic error for this specific song
          updatedSongs[i] = {
            ...song,
            status: "not_found",
            spotifyUri: undefined,
            spotifyAlbumCover: undefined,
          };
        }

        setSongs([...updatedSongs]);
      }

      const foundCount = updatedSongs.filter((s) => s.status === "found").length;
      setStatusStepText(
        `Verifica completata: ${foundCount} brani trovati su ${updatedSongs.length}.`
      );
    } catch (err: unknown) {
      const error = err as Error;
      if (
        error instanceof SpotifyRateLimitError ||
        error?.name === "SpotifyRateLimitError"
      ) {
        const retrySec = (error as SpotifyRateLimitError).retryAfter || null;
        setRateLimitRetryAfter(retrySec);
        setIsRateLimitModalOpen(true);
        setErrorMessage("Limite di richieste Spotify raggiunto (Rate Limit 429).");
      } else {
        setErrorMessage(error.message || "Errore durante la verifica dei brani.");
      }
    } finally {
      setIsVerifying(false);
      setActiveCheckingSongId(null);
    }
  };

  // 7. Step 2: Open Confirmation Modal
  const handleRequestCreatePlaylist = () => {
    const hasUnchecked = songs.some((s) => s.status === "pending" || !s.status);
    if (hasUnchecked) {
      setErrorMessage(
        "Verifica prima i brani su Spotify per controllare quali sono disponibili."
      );
      return;
    }

    const foundCount = songs.filter((s) => s.status === "found").length;
    if (foundCount === 0) {
      setErrorMessage("Nessun brano trovato su Spotify da inserire nella playlist.");
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // 8. Step 3: Execute Playlist Creation on Spotify
  const handleExecuteCreateSpotifyPlaylist = async () => {
    const token = getStoredAccessToken();

    if (!token) {
      await initiateSpotifyAuth({
        playlistName,
        songs,
        autoCreateAfterAuth: true,
      });
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setStatusStepText("Creazione della playlist in corso...");

    try {
      const result = await createPlaylistAndAddTracks(
        token,
        playlistName,
        songs,
        `Creata da screenshot tramite SnapToPlaylist (Gemini Vision AI)`
      );

      setIsConfirmModalOpen(false);
      setCreatedPlaylistResult(result);
    } catch (err: unknown) {
      const error = err as Error;
      if (
        error instanceof SpotifyRateLimitError ||
        error?.name === "SpotifyRateLimitError"
      ) {
        const retrySec = (error as SpotifyRateLimitError).retryAfter || null;
        setIsConfirmModalOpen(false);
        setRateLimitRetryAfter(retrySec);
        setIsRateLimitModalOpen(true);
        setErrorMessage("Limite di richieste Spotify raggiunto (Rate Limit 429). Riprova tra poco.");
      } else if (error.message.includes("401") || error.message.includes("scaduta")) {
        logoutSpotify();
        setUserProfile(null);
        setErrorMessage("Sessione Spotify scaduta. Effettua nuovamente il login.");
      } else {
        setErrorMessage(error.message || "Errore nella creazione della playlist.");
      }
    } finally {
      setIsCreating(false);
      setStatusStepText("");
    }
  };

  const handleLogout = () => {
    logoutSpotify();
    setUserProfile(null);
    setSuccessMessage("Disconnesso da Spotify.");
  };

  // Reset to initial screen
  const handleResetToHome = () => {
    setSongs([]);
    setPlaylistName("");
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveCheckingSongId(null);
    setStatusStepText("");
    setIsConfirmModalOpen(false);
    setIsRateLimitModalOpen(false);
    setRateLimitRetryAfter(null);
  };

  // Show loading spinner while checking access
  if (isAccessChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1DB954]" />
      </div>
    );
  }

  // Show Lock Gate if access is not granted
  if (!isAccessGranted) {
    return <AccessGate onUnlock={() => setIsAccessGranted(true)} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-[#1DB954]/30 selection:text-white">
      {/* Navigation with clickable logo to reset */}
      <Navbar
        userProfile={userProfile}
        onLogout={handleLogout}
        onLoginSpotify={() => initiateSpotifyAuth()}
        onResetToHome={handleResetToHome}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Animated Alerts */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-rose-950/70 border border-rose-800/80 rounded-2xl p-4 flex items-start gap-3 text-rose-200 shadow-xl"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-xs sm:text-sm font-medium">{errorMessage}</p>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-xs text-rose-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </motion.button>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-emerald-950/70 border border-emerald-800/80 rounded-2xl p-4 flex items-center gap-3 text-emerald-200 shadow-xl"
            >
              <CheckCircle2 className="w-5 h-5 text-[#1DB954] flex-shrink-0" />
              <p className="flex-1 text-xs sm:text-sm font-medium">{successMessage}</p>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-xs text-emerald-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Transition: Upload View vs Song List View */}
        <AnimatePresence mode="wait">
          {songs.length === 0 ? (
            <motion.div
              key="hero-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 sm:space-y-12"
            >
              {/* Hero */}
              <div className="text-center max-w-2xl mx-auto space-y-3 pt-2 sm:pt-4 px-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] font-semibold text-neutral-300 shadow-lg"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>Gemini Vision AI + Spotify API</span>
                </motion.div>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                  Da Screenshot a{" "}
                  <span className="bg-gradient-to-r from-[#1DB954] via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    Playlist Spotify
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
                  Carica uno screenshot con brani musicali. Gemini riconosce i titoli, potrai verificarli singolarmente su Spotify e creare la playlist con un click.
                </p>
              </div>

              {/* Uploader */}
              <ImageUploader
                onAnalyzeImage={handleAnalyzeImage}
                isLoading={isExtracting}
              />

              {/* Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-neutral-850">
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 space-y-1.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-white">OCR Gemini Vision</h3>
                  <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                    Riconosce testo e brani da immagini a qualsiasi risoluzione e genera il nome della playlist.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 space-y-1.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
                    <Music className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-white">Verifica Accurata</h3>
                  <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                    Verifica in tempo reale su Spotify senza falsi positivi per brani o artisti inesistenti.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 space-y-1.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-white">OAuth PKCE Sicuro</h3>
                  <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                    Autenticazione diretta e sicura con Spotify senza trasmissione di credenziali sensibili.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            /* View 2: Song List & Separated Check / Create Flow */
            <SongList
              key="songlist-view"
              songs={songs}
              playlistName={playlistName}
              onPlaylistNameChange={setPlaylistName}
              onUpdateSong={handleUpdateSong}
              onDeleteSong={handleDeleteSong}
              onAddSong={handleAddSong}
              onVerifyTracks={handleVerifySpotifyTracks}
              onRequestCreatePlaylist={handleRequestCreatePlaylist}
              isVerifying={isVerifying}
              isCreating={isCreating}
              activeCheckingSongId={activeCheckingSongId}
              statusStepText={statusStepText}
              onReset={handleResetToHome}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-850 bg-neutral-950 py-5 text-center text-[11px] text-neutral-500">
        <p>
          SnapToPlaylist • Powered by{" "}
          <span className="text-indigo-400 font-semibold">Gemini Vision AI</span> &amp;{" "}
          <span className="text-[#1DB954] font-semibold">Spotify Web API</span>
        </p>
      </footer>

      {/* Confirmation Modal */}
      <CreatePlaylistConfirmModal
        isOpen={isConfirmModalOpen}
        playlistName={playlistName}
        songs={songs}
        isCreating={isCreating}
        onConfirm={handleExecuteCreateSpotifyPlaylist}
        onClose={() => setIsConfirmModalOpen(false)}
      />

      {/* Success Modal */}
      <PlaylistCreatedModal
        result={createdPlaylistResult}
        onClose={() => setCreatedPlaylistResult(null)}
      />

      {/* Spotify Rate Limit Modal */}
      <SpotifyRateLimitModal
        isOpen={isRateLimitModalOpen}
        retryAfter={rateLimitRetryAfter}
        onClose={() => setIsRateLimitModalOpen(false)}
        onRetry={() => {
          setIsRateLimitModalOpen(false);
          handleVerifySpotifyTracks(false);
        }}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#1DB954] border-t-transparent rounded-full" />
        </div>
      }
    >
      <MainAppContent />
    </Suspense>
  );
}
