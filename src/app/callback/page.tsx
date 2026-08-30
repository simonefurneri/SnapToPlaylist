"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  exchangeAuthCodeForToken,
  isSpotifyAuthenticated,
  logoutSpotify,
} from "@/lib/spotify";
import { Loader2, Music2, AlertCircle } from "lucide-react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Connessione a Spotify in corso...");
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate execution in React StrictMode (authorization code is single-use)
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    async function processAuth() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const authError = searchParams.get("error");

      if (authError) {
        setError(`Accesso Spotify annullato o negato: ${authError}`);
        return;
      }

      if (!code || !state) {
        if (isSpotifyAuthenticated()) {
          router.push("/?spotify_auth=success");
          return;
        }
        setError("Parametri di autenticazione mancanti.");
        return;
      }

      try {
        setStatusText("Verifica del token di sicurezza PKCE...");
        await exchangeAuthCodeForToken(code, state);
        setStatusText("Autenticazione completata! Ritorno all'app...");
        router.replace("/?spotify_auth=success");
      } catch (err: unknown) {
        logoutSpotify();
        const message =
          err instanceof Error
            ? err.message
            : "Si è verificato un errore durante il login Spotify.";
        setError(message);
      }
    }

    processAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl backdrop-blur">
        <div className="w-16 h-16 bg-[#1DB954]/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-[#1DB954]/20">
          {error ? (
            <AlertCircle className="w-8 h-8 text-rose-500" />
          ) : (
            <Music2 className="w-8 h-8 text-[#1DB954] animate-pulse" />
          )}
        </div>

        <h2 className="text-xl font-bold mb-2">
          {error ? "Errore di Autenticazione" : "Spotify OAuth"}
        </h2>

        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-rose-400 bg-rose-950/40 p-3 rounded-lg border border-rose-900/50">
              {error}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-medium text-sm transition-all cursor-pointer"
            >
              Torna alla Home
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-neutral-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#1DB954]" />
              <span>{statusText}</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#1DB954] h-full rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1DB954]" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
