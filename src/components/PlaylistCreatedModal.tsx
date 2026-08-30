"use client";

import React, { useEffect } from "react";
import { CreatedPlaylistResult } from "@/types";
import {
  CheckCircle2,
  ExternalLink,
  X,
  Share2,
  ListMusic,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";

interface PlaylistCreatedModalProps {
  result: CreatedPlaylistResult | null;
  onClose: () => void;
}

export function PlaylistCreatedModal({
  result,
  onClose,
}: PlaylistCreatedModalProps) {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (result) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#1DB954", "#1ed760", "#ffffff", "#38bdf8"],
        });
      } catch {
        // ignore
      }
    }
  }, [result]);

  if (!result) return null;

  const spotifyUrl = result.external_urls?.spotify;

  const handleCopyLink = () => {
    if (spotifyUrl) {
      navigator.clipboard.writeText(spotifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-center text-white overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#1DB954]/20 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-all duration-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[#1DB954] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#1DB954]/20">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight">
          Playlist Creata con Successo!
        </h3>
        <p className="text-xs sm:text-sm text-neutral-400 mb-6">
          La playlist è pronta e disponibile nel tuo account Spotify.
        </p>

        {/* Playlist Card Preview */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 text-left mb-6 flex items-center gap-4 shadow-inner">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 text-white shadow">
            <ListMusic className="w-7 h-7 text-[#1DB954]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{result.name}</h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              <span className="text-[#1DB954] font-bold">
                {result.totalTracksAdded}
              </span>{" "}
              di {result.totalTracksRequested} brani inseriti
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {spotifyUrl && (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-sm transition-all duration-200 shadow-lg shadow-[#1DB954]/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Apri su Spotify</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer active:scale-95"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
