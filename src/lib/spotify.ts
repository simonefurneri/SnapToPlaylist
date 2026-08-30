import {
  ExtractedSong,
  SpotifyUserProfile,
  SpotifySearchResponse,
  CreatedPlaylistResult,
} from "@/types";

const SPOTIFY_AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export class SpotifyRateLimitError extends Error {
  constructor(message: string = "Limite di richieste Spotify raggiunto (429 Too Many Requests).") {
    super(message);
    this.name = "SpotifyRateLimitError";
    Object.setPrototypeOf(this, SpotifyRateLimitError.prototype);
  }
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "stp_spotify_access_token",
  REFRESH_TOKEN: "stp_spotify_refresh_token",
  EXPIRES_AT: "stp_spotify_expires_at",
  CODE_VERIFIER: "stp_spotify_code_verifier",
  AUTH_STATE: "stp_spotify_auth_state",
  PENDING_ACTION: "stp_pending_playlist_creation",
  USER_PROFILE: "stp_spotify_user_profile",
  CUSTOM_CLIENT_ID: "stp_custom_client_id",
};

export const SPOTIFY_SCOPES = [
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-private",
  "user-read-email",
].join(" ");

// Get client ID from environment or user-saved localStorage
export function getSpotifyClientId(): string {
  if (typeof window !== "undefined") {
    const customId = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
    if (customId && customId.trim().length > 0) {
      return customId.trim();
    }
  }
  return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
}

export function setCustomSpotifyClientId(clientId: string) {
  if (typeof window !== "undefined") {
    if (clientId.trim()) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLIENT_ID, clientId.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
    }
  }
}

// Generate redirect URI dynamically based on current origin
export function getSpotifyRedirectUri(): string {
  if (typeof window !== "undefined") {
    // Spotify rejects 'localhost', so map localhost to 127.0.0.1 loopback IP
    if (window.location.hostname === "localhost") {
      return `http://127.0.0.1:${window.location.port || "3000"}/callback`;
    }
    // On any production domain (e.g. tuodominio.it or tuoprogetto.vercel.app), use current origin
    return `${window.location.origin}/callback`;
  }
  return process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/callback";
}

// Helper: Generate random string for PKCE code verifier
export function generateRandomString(length: number = 64): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

// Helper: Base64URL encode buffer
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper: Generate SHA-256 code challenge from verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

// Check if currently stored token is still valid
export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!token || !expiresAt) return null;

  // Check expiration with 60 second safety buffer
  if (Date.now() > parseInt(expiresAt, 10) - 60000) {
    return null; // Expired
  }

  return token;
}

export function isSpotifyAuthenticated(): boolean {
  return !!getStoredAccessToken();
}

export function getStoredUserProfile(): SpotifyUserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Save authentication tokens in storage
export function saveSpotifyTokens(
  accessToken: string,
  refreshToken?: string,
  expiresIn: number = 3600
) {
  if (typeof window === "undefined") return;
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
}

// Clear all auth storage
export function logoutSpotify() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  localStorage.removeItem(STORAGE_KEYS.PENDING_ACTION);
  if (typeof document !== "undefined") {
    document.cookie = "stp_verifier=; path=/; max-age=0";
  }
}

// Safe Base64 helpers for UTF-8 and iOS Safari compatibility
function safeBase64Encode(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

function safeBase64Decode(str: string): string {
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

// Start Spotify OAuth Authorization Code Flow with PKCE
export async function initiateSpotifyAuth(pendingPlaylistData?: {
  playlistName: string;
  songs: ExtractedSong[];
  autoCreateAfterAuth?: boolean;
}): Promise<void> {
  const clientId = getSpotifyClientId();
  if (!clientId) {
    throw new Error(
      "Spotify Client ID non configurato. Inseriscilo nelle impostazioni o in NEXT_PUBLIC_SPOTIFY_CLIENT_ID."
    );
  }

  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getSpotifyRedirectUri();

  // Encode state containing CSRF + verifier + pending playlist data safely for UTF-8
  const statePayload = {
    csrf: generateRandomString(16),
    v: verifier,
    pending: pendingPlaylistData || null,
  };
  const state = safeBase64Encode(JSON.stringify(statePayload));

  // Save verifier and state locally & cookie
  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, verifier);
  localStorage.setItem(STORAGE_KEYS.AUTH_STATE, state);
  if (typeof document !== "undefined") {
    document.cookie = `stp_verifier=${encodeURIComponent(verifier)}; path=/; max-age=600; SameSite=Lax`;
  }

  // If there's a pending playlist creation, persist it
  if (pendingPlaylistData) {
    localStorage.setItem(
      STORAGE_KEYS.PENDING_ACTION,
      JSON.stringify(pendingPlaylistData)
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: state,
    scope: SPOTIFY_SCOPES,
    show_dialog: "true",
  });

  window.location.href = `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
}

// Exchange Auth Code for Access Token
export async function exchangeAuthCodeForToken(
  code: string,
  returnedState: string
): Promise<{ accessToken: string; profile: SpotifyUserProfile }> {
  let verifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);

  // Fallback 1: extract verifier and pending data from returned state
  if (returnedState) {
    try {
      const decodedStr = safeBase64Decode(returnedState);
      if (decodedStr) {
        const decoded = JSON.parse(decodedStr);
        if (decoded && decoded.v) {
          verifier = decoded.v;
        }
        if (decoded && decoded.pending) {
          localStorage.setItem(
            STORAGE_KEYS.PENDING_ACTION,
            JSON.stringify(decoded.pending)
          );
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback 2: cookie
  if (!verifier && typeof document !== "undefined") {
    const match = document.cookie.match(/stp_verifier=([^;]+)/);
    if (match) {
      verifier = decodeURIComponent(match[1]);
    }
  }

  const clientId = getSpotifyClientId();
  const redirectUri = getSpotifyRedirectUri();

  if (!verifier) {
    throw new Error("Codice di verifica PKCE non trovato. Riprova il login.");
  }

  // Clean state items
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
  if (typeof document !== "undefined") {
    document.cookie = "stp_verifier=; path=/; max-age=0";
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const tokenRes = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errorData = await tokenRes.json().catch(() => ({}));
    throw new Error(
      errorData.error_description ||
        errorData.error ||
        `Errore durante l'ottenimento del token Spotify (${tokenRes.status})`
    );
  }

  const tokenData = await tokenRes.json();
  saveSpotifyTokens(
    tokenData.access_token,
    tokenData.refresh_token,
    tokenData.expires_in
  );

  // Fetch and save user profile
  const profile = await fetchCurrentUserProfile(tokenData.access_token);
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));

  return { accessToken: tokenData.access_token, profile };
}

// Get pending action if any after callback
export function getAndClearPendingPlaylistAction(): {
  playlistName: string;
  songs: ExtractedSong[];
  autoCreateAfterAuth?: boolean;
} | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.PENDING_ACTION);
  if (!raw) return null;
  localStorage.removeItem(STORAGE_KEYS.PENDING_ACTION);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Fetch Current User Profile
export async function fetchCurrentUserProfile(
  accessToken: string
): Promise<SpotifyUserProfile> {
  const res = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new SpotifyRateLimitError(
        "Limite di richieste Spotify raggiunto (429 Too Many Requests)."
      );
    }
    if (res.status === 401) {
      logoutSpotify();
      throw new Error("Sessione Spotify scaduta. Effettua nuovamente l'accesso.");
    }
    throw new Error(`Impossibile recuperare il profilo utente Spotify (${res.status})`);
  }

  return res.json();
}

// Helper: Normalize string for comparison
function normalizeTrackString(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[([].*?[)\]]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Check if a Spotify result genuinely matches the requested title and artist
function isTrackGenuineMatch(
  queryTitle: string,
  queryArtist: string,
  resultTitle: string,
  resultArtists: Array<{ name: string }>
): boolean {
  const qTitle = normalizeTrackString(queryTitle);
  const rTitle = normalizeTrackString(resultTitle);
  const qArtist = normalizeTrackString(queryArtist);
  const rArtists = resultArtists.map((a) => normalizeTrackString(a.name));

  if (!qTitle || qTitle.length < 2) return false;

  // Title verification
  const qTitleWords = qTitle.split(" ").filter((w) => w.length > 1);

  const exactOrSubstring =
    rTitle.includes(qTitle) ||
    qTitle.includes(rTitle) ||
    rTitle.replace(/\s/g, "") === qTitle.replace(/\s/g, "");

  let titleMatches = exactOrSubstring;
  if (!titleMatches && qTitleWords.length > 0) {
    const matchedCount = qTitleWords.filter((w) => rTitle.includes(w)).length;
    titleMatches = matchedCount / qTitleWords.length >= 0.6;
  }

  if (!titleMatches) {
    return false;
  }

  // Artist verification (if artist was supplied by user)
  if (qArtist && qArtist.length > 1) {
    const qArtistWords = qArtist.split(" ").filter((w) => w.length > 1);
    const artistMatches = rArtists.some((rArt) => {
      if (rArt.includes(qArtist) || qArtist.includes(rArt)) return true;
      if (qArtistWords.length > 0) {
        const matchCount = qArtistWords.filter((w) => rArt.includes(w)).length;
        return matchCount / qArtistWords.length >= 0.5;
      }
      return false;
    });

    if (!artistMatches) {
      return false;
    }
  }

  return true;
}

interface CachedTrackMatch {
  found: boolean;
  spotifyUri?: string;
  spotifyTrackName?: string;
  spotifyArtistName?: string;
  spotifyAlbumCover?: string;
  spotifyTrackUrl?: string;
  spotifyPreviewUrl?: string | null;
  cachedAt: number;
}

const memoryTrackCache = new Map<string, CachedTrackMatch>();
const TRACK_CACHE_PREFIX = "stp_track_cache_";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getTrackCacheKey(title: string, artist: string): string {
  const normTitle = normalizeTrackString(title);
  const normArtist = normalizeTrackString(artist);
  return `${normTitle}__${normArtist}`;
}

export function getCachedTrack(title: string, artist: string): CachedTrackMatch | null {
  const key = getTrackCacheKey(title, artist);

  // 1. Check in-memory cache first
  const inMemory = memoryTrackCache.get(key);
  if (inMemory && Date.now() - inMemory.cachedAt < CACHE_TTL_MS) {
    return inMemory;
  }

  // 2. Check localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`${TRACK_CACHE_PREFIX}${key}`);
      if (raw) {
        const parsed: CachedTrackMatch = JSON.parse(raw);
        if (parsed && Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
          memoryTrackCache.set(key, parsed);
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function setCachedTrack(
  title: string,
  artist: string,
  data: Omit<CachedTrackMatch, "cachedAt">
): void {
  const key = getTrackCacheKey(title, artist);
  const item: CachedTrackMatch = {
    ...data,
    cachedAt: Date.now(),
  };

  memoryTrackCache.set(key, item);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${TRACK_CACHE_PREFIX}${key}`, JSON.stringify(item));
    } catch {
      // ignore
    }
  }
}

// Search a track on Spotify with strict validation, caching and micro-retry
export async function searchSpotifyTrack(
  accessToken: string,
  title: string,
  artist: string
): Promise<{
  found: boolean;
  spotifyUri?: string;
  spotifyTrackName?: string;
  spotifyArtistName?: string;
  spotifyAlbumCover?: string;
  spotifyTrackUrl?: string;
  spotifyPreviewUrl?: string | null;
  fromCache?: boolean;
}> {
  // 1. Check local & memory cache first to save API quota
  const cached = getCachedTrack(title, artist);
  if (cached) {
    return {
      found: cached.found,
      spotifyUri: cached.spotifyUri,
      spotifyTrackName: cached.spotifyTrackName,
      spotifyArtistName: cached.spotifyArtistName,
      spotifyAlbumCover: cached.spotifyAlbumCover,
      spotifyTrackUrl: cached.spotifyTrackUrl,
      spotifyPreviewUrl: cached.spotifyPreviewUrl,
      fromCache: true,
    };
  }

  const cleanTitle = title
    .replace(/[([].*?[)\]]/g, "")
    .replace(/feat\..*$/i, "")
    .replace(/ft\..*$/i, "")
    .trim();

  const cleanArtist = artist
    .replace(/[([].*?[)\]]/g, "")
    .replace(/feat\..*$/i, "")
    .replace(/ft\..*$/i, "")
    .trim();

  if (!cleanTitle) {
    setCachedTrack(title, artist, { found: false });
    return { found: false };
  }

  // Queries to try
  const queries: string[] = [];
  if (cleanTitle && cleanArtist) {
    queries.push(`track:"${cleanTitle}" artist:"${cleanArtist}"`);
    queries.push(`${cleanTitle} ${cleanArtist}`);
  } else {
    queries.push(`track:"${cleanTitle}"`);
    queries.push(cleanTitle);
  }

  for (const q of queries) {
    try {
      const url = `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(
        q
      )}&type=track&limit=5`;

      let res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Micro-retry on 429 (wait 2.5s and retry once before failing)
      if (res.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }

      if (res.status === 429) {
        throw new SpotifyRateLimitError(
          "Limite di richieste Spotify raggiunto (429 Too Many Requests)."
        );
      }

      if (res.status === 401) {
        throw new Error("Sessione Spotify scaduta.");
      }

      if (res.ok) {
        const data: SpotifySearchResponse = await res.json();
        const items = data.tracks?.items || [];

        // Check if any returned track strictly matches title & artist
        for (const item of items) {
          if (
            isTrackGenuineMatch(
              cleanTitle,
              cleanArtist,
              item.name,
              item.artists
            )
          ) {
            const matchedData = {
              found: true,
              spotifyUri: item.uri,
              spotifyTrackName: item.name,
              spotifyArtistName: item.artists.map((a) => a.name).join(", "),
              spotifyAlbumCover: item.album?.images?.[0]?.url || "",
              spotifyTrackUrl: item.external_urls?.spotify || "",
              spotifyPreviewUrl: item.preview_url,
            };

            // Save in cache
            setCachedTrack(title, artist, matchedData);
            return matchedData;
          }
        }
      }
    } catch (err: unknown) {
      if (
        err instanceof SpotifyRateLimitError ||
        (err as Error)?.name === "SpotifyRateLimitError" ||
        (err as Error)?.message?.includes("Sessione Spotify scaduta")
      ) {
        throw err;
      }
    }
  }

  // Not found - cache negative result as well to avoid repeating failed searches
  setCachedTrack(title, artist, { found: false });
  return { found: false };
}

// Create Playlist and Add Tracks
export async function createPlaylistAndAddTracks(
  accessToken: string,
  playlistName: string,
  songs: ExtractedSong[],
  description: string = "Creata con SnapToPlaylist powered by Gemini AI"
): Promise<CreatedPlaylistResult> {
  const profile = await fetchCurrentUserProfile(accessToken);

  if (!profile || !profile.id) {
    throw new Error("Impossibile recuperare il profilo utente Spotify.");
  }

  // 1. Create playlist under /v1/users/{user_id}/playlists
  let playlistId = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playlistData: any = null;

  // Try creating as private first, then public if needed
  const createPayloads = [
    { name: playlistName || "La mia Playlist Snap", description, public: false },
    { name: playlistName || "La mia Playlist Snap", description, public: true },
  ];

  let lastCreateError: Error | null = null;
  for (const payload of createPayloads) {
    try {
      const createRes = await fetch(
        `${SPOTIFY_API_BASE}/users/${encodeURIComponent(profile.id)}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (createRes.ok) {
        playlistData = await createRes.json();
        playlistId = playlistData.id;
        break;
      } else {
        const errJson = await createRes.json().catch(() => ({}));
        lastCreateError = new Error(
          errJson.error?.message || `Status ${createRes.status}`
        );
      }
    } catch (err: unknown) {
      lastCreateError = err as Error;
    }
  }

  // Fallback to /me/playlists if /users/{id}/playlists was rejected
  if (!playlistId) {
    const res = await fetch(`${SPOTIFY_API_BASE}/me/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: playlistName || "La mia Playlist Snap",
        description,
        public: false,
      }),
    });
    if (res.ok) {
      playlistData = await res.json();
      playlistId = playlistData.id;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.error?.message ||
          lastCreateError?.message ||
          `Impossibile creare la playlist su Spotify.`
      );
    }
  }

  // 2. Filter URIs of found songs
  const urisToAdd = songs
    .filter((s) => s.status === "found" && s.spotifyUri)
    .map((s) => s.spotifyUri as string)
    .filter((u) => u.startsWith("spotify:track:"));

  // 3. Add tracks in batches of max 100
  let addedCount = 0;
  if (urisToAdd.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < urisToAdd.length; i += chunkSize) {
      const chunk = urisToAdd.slice(i, i + chunkSize);

      // Attempt 1: Modern endpoint POST /v1/playlists/{id}/items with JSON body
      let addRes = await fetch(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}/items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: chunk,
          }),
        }
      );

      // Attempt 2: Legacy endpoint POST /v1/playlists/{id}/tracks with JSON body
      if (!addRes.ok) {
        console.warn(
          `Tentativo /items fallito (${addRes.status}), provo con /tracks...`
        );
        addRes = await fetch(
          `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: chunk,
            }),
          }
        );
      }

      // Attempt 3: Query parameters fallback
      if (!addRes.ok) {
        console.warn(
          `Tentativo JSON fallito (${addRes.status}), provo via query params...`
        );
        const queryUris = encodeURIComponent(chunk.join(","));
        addRes = await fetch(
          `${SPOTIFY_API_BASE}/playlists/${playlistId}/items?uris=${queryUris}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }

      if (!addRes.ok) {
        const errorText = await addRes.text();
        console.error("Errore nell'aggiunta tracce:", errorText);
        if (addRes.status === 403) {
          throw new Error(
            "Accesso negato (403 Forbidden). Assicurati che il tuo account Spotify sia registrato in 'User Management' nella dashboard sviluppatore di Spotify e di aver concesso i permessi di scrittura."
          );
        }
      } else {
        addedCount += chunk.length;
      }
    }
  }

  return {
    id: playlistId,
    name: playlistData.name,
    description: playlistData.description,
    external_urls: playlistData.external_urls,
    uri: playlistData.uri,
    totalTracksAdded: addedCount,
    totalTracksFound: urisToAdd.length,
    totalTracksRequested: songs.length,
    imageUrl: playlistData.images?.[0]?.url,
  };
}
