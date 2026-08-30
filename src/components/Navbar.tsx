"use client";

import React from "react";
import { SpotifyUserProfile } from "@/types";
import { LogOut, ExternalLink } from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  userProfile: SpotifyUserProfile | null;
  onLogout: () => void;
  onLoginSpotify: () => void;
  onResetToHome: () => void;
}

export function Navbar({
  userProfile,
  onLogout,
  onLoginSpotify,
  onResetToHome,
}: NavbarProps) {
  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        {/* Clickable Logo */}
        <button
          type="button"
          onClick={onResetToHome}
          className="flex items-center gap-2.5 sm:gap-3 group text-left cursor-pointer transition-transform active:scale-95 duration-200"
          title="Torna alla Home e ricarica un nuovo screenshot"
        >
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg shadow-[#1DB954]/20 group-hover:shadow-[#1DB954]/40 group-hover:scale-105 transition-all duration-300">
            <Image
              src="/logo.svg"
              alt="SnapToPlaylist Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent group-hover:from-emerald-400 group-hover:to-cyan-400 transition-all duration-300">
                SnapToPlaylist
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium leading-none hidden xs:block">
              Screenshot to Spotify AI
            </p>
          </div>
        </button>

        {/* User / Auth section */}
        <div className="flex items-center gap-2">
          {userProfile ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-neutral-900/90 border border-neutral-800 py-1 px-2 sm:px-2.5 rounded-full text-xs font-medium text-neutral-200 shadow-sm">
                {userProfile.images?.[0]?.url ? (
                  <img
                    src={userProfile.images[0].url}
                    alt={userProfile.display_name}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-[#1DB954]"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#1DB954] text-neutral-950 font-bold text-[10px] flex items-center justify-center">
                    {userProfile.display_name?.charAt(0).toUpperCase() || "S"}
                  </div>
                )}
                <span className="max-w-[85px] sm:max-w-[130px] truncate text-[11px] sm:text-xs">
                  {userProfile.display_name}
                </span>
                {userProfile.external_urls?.spotify && (
                  <a
                    href={userProfile.external_urls.spotify}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-400 hover:text-[#1DB954] transition-colors cursor-pointer"
                    title="Apri profilo Spotify"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Disconnetti Spotify"
                className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-all duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoginSpotify}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
              <span>Accedi a Spotify</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
