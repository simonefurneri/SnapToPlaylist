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

export class SpotifyForbiddenError extends Error {
  constructor(
    message: string = "Accesso negato da Spotify (403 Forbidden). Il tuo account non è registrato tra gli utenti autorizzati nella Developer Dashboard di Spotify (Modalità Sviluppo) oppure non dispone dei permessi necessari."
  ) {
    super(message);
    this.name = "SpotifyForbiddenError";
    Object.setPrototypeOf(this, SpotifyForbiddenError.prototype);
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

  // Validate user profile BEFORE storing tokens permanently
  try {
    const profile = await fetchCurrentUserProfile(tokenData.access_token);
    saveSpotifyTokens(
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    return { accessToken: tokenData.access_token, profile };
  } catch (err) {
    // If fetching profile fails (e.g. 403 forbidden / unregistered user), ensure tokens are wiped
    logoutSpotify();
    throw err;
  }
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
    if (res.status === 403) {
      logoutSpotify();
      const errData = await res.json().catch(() => ({}));
      const detail = errData?.error?.message ? ` (${errData.error.message})` : "";
      throw new SpotifyForbiddenError(
        `Accesso negato da Spotify (403 Forbidden)${detail}. Il tuo account Spotify non è registrato tra gli utenti abilitati nella Developer Dashboard di Spotify (Modalità Sviluppo). Contatta l'amministratore per abilitare la tua email.`
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

// Sanitize search query for Spotify API (preserves all original words, removes Lucene syntax chars)
function sanitizeSearchQuery(title: string, artist: string): string {
  const raw = `${title || ""} ${artist || ""}`;
  return raw
    .replace(/(^|\s|[([{"'])f[\*#@!_]{1,4}kin(?=$|\s|[.,!?\])}'"])/gi, "$1fucking")
    .replace(/(^|\s|[([{"'])f[\*#@!_]{1,4}king(?=$|\s|[.,!?\])}'"])/gi, "$1fucking")
    .replace(/(^|\s|[([{"'])f[\*#@!_]{1,4}k(?=$|\s|[.,!?\])}'"])/gi, "$1fuck")
    .replace(/(^|\s|[([{"'])f\*ck(?=$|\s|[.,!?\])}'"])/gi, "$1fuck")
    .replace(/(^|\s|[([{"'])f[\*#@!_]{2,4}(?=$|\s|[.,!?\])}'"])/gi, "$1fuck")
    .replace(/(^|\s|[([{"'])s[\*#@!_]{1,4}t(?=$|\s|[.,!?\])}'"])/gi, "$1shit")
    .replace(/(^|\s|[([{"'])b[\*#@!_]{1,4}ch(?=$|\s|[.,!?\])}'"])/gi, "$1bitch")
    .replace(/["':;()[\]{}<>|\\^~]/g, " ")
    .replace(/\*+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Normalize strings for comparison & scoring (removes noise, parenthesis, diacritics)
function normalizeTrackString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[([].*?[)\]]/g, " ") // remove parenthesis like (feat. X) or (Remastered)
    .replace(/(^|\s|[([{"'])f[\*#@!_]{1,4}k(?=$|\s|[.,!?\])}'"])/gi, "$1fuck")
    .replace(/(^|\s|[([{"'])s[\*#@!_]{1,4}t(?=$|\s|[.,!?\])}'"])/gi, "$1shit")
    .replace(/(^|\s|[([{"'])b[\*#@!_]{1,4}ch(?=$|\s|[.,!?\])}'"])/gi, "$1bitch")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(\w+)in\b/g, "$1ing") // map somethin -> something, fuckin -> fucking
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein distance for typo tolerance
function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const d: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  return d[s1.length][s2.length];
}

// Calculate similarity ratio (0.0 to 1.0)
function calculateStringSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeTrackString(s1);
  const norm2 = normalizeTrackString(s2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  // Substring check
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    return Math.max(0.85, minLen / maxLen);
  }

  // Token / word overlap
  const words1 = norm1.split(" ").filter((w) => w.length > 1);
  const words2 = norm2.split(" ").filter((w) => w.length > 1);

  if (words1.length > 0 && words2.length > 0) {
    const matchedCount = words1.filter((w) =>
      words2.some((w2) => w2 === w || w2.includes(w) || w.includes(w2))
    ).length;
    const tokenScore = (2 * matchedCount) / (words1.length + words2.length);
    if (tokenScore >= 0.7) {
      return tokenScore;
    }
  }

  // Levenshtein similarity
  const maxLen = Math.max(norm1.length, norm2.length);
  const dist = levenshteinDistance(norm1, norm2);
  const levScore = 1 - dist / maxLen;

  return Math.max(0, levScore);
}

// Calculate overall score for a candidate Spotify track (0 to 1.0)
function scoreTrackMatch(
  queryTitle: string,
  queryArtist: string,
  candidate: {
    name: string;
    artists: Array<{ name: string }>;
    popularity?: number;
  }
): number {
  const normQTitle = normalizeTrackString(queryTitle);
  const normQArtist = normalizeTrackString(queryArtist);
  const popularityScore =
    Math.min(100, Math.max(0, candidate.popularity || 0)) / 100;

  if (!normQTitle) return 0;

  // Title similarity
  const titleSim = calculateStringSimilarity(queryTitle, candidate.name);

  // Artist similarity (check each artist and full artist list)
  let artistSim = 0;
  if (normQArtist) {
    const candidateArtistNames = candidate.artists.map((a) => a.name);
    const joinedArtists = candidateArtistNames.join(" ");

    const individualSims = candidateArtistNames.map((name) =>
      calculateStringSimilarity(queryArtist, name)
    );
    const joinedSim = calculateStringSimilarity(queryArtist, joinedArtists);
    artistSim = Math.max(joinedSim, ...individualSims, 0);
  } else {
    // If no artist was specified by user, artist match is neutral / doesn't penalize
    artistSim = 0.8;
  }

  // Exact or near-exact title match
  const isExactTitle = titleSim >= 0.95;
  const isDistinctiveTitle =
    normQTitle.length >= 8 || normQTitle.split(" ").length >= 2;

  // If title matches almost perfectly:
  if (isExactTitle) {
    if (artistSim >= 0.6) {
      // Both match great
      return Math.min(
        1.0,
        0.6 * titleSim + 0.35 * artistSim + 0.05 * popularityScore + 0.05
      );
    }
    // Title is exact, but artist diverges (e.g. Wham! vs George Michael)
    if (isDistinctiveTitle && popularityScore >= 0.4) {
      // Distinctive title with high Spotify popularity: canonical version / artist relation
      return Math.min(
        1.0,
        0.65 * titleSim + 0.15 * artistSim + 0.2 * popularityScore
      );
    }
    // Generic single short word title with zero artist match (e.g. "Stay" by random person): penalize
    if (!isDistinctiveTitle && artistSim < 0.3) {
      return 0.4 * titleSim + 0.5 * artistSim + 0.1 * popularityScore;
    }
  }

  // Standard weighted formula
  const baseScore =
    0.6 * titleSim + 0.35 * artistSim + 0.05 * popularityScore;
  return Math.min(1.0, Math.max(0, baseScore));
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

// Minimum match percentage score required to accept a Spotify track match (60%)
const MIN_MATCH_SCORE_THRESHOLD = 0.60;

// Search a track on Spotify with intelligent single query, candidate scoring, and caching
export async function searchSpotifyTrack(
  accessToken: string,
  title: string,
  artist: string,
  options?: {
    useCache?: boolean;
  }
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
  const allowCacheRead = options?.useCache !== false;

  // 1. Check local & memory cache first to save API quota (if enabled)
  if (allowCacheRead) {
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
  }

  const searchQuery = sanitizeSearchQuery(title, artist);

  if (!searchQuery) {
    setCachedTrack(title, artist, { found: false });
    return { found: false };
  }

  try {
    const url = `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(
      searchQuery
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

    if (res.status === 403) {
      logoutSpotify();
      const errData = await res.json().catch(() => ({}));
      const detail = errData?.error?.message ? ` (${errData.error.message})` : "";
      throw new SpotifyForbiddenError(
        `Accesso negato da Spotify (403 Forbidden)${detail}: account non autorizzato nella Developer Dashboard di Spotify.`
      );
    }

    if (res.status === 401) {
      logoutSpotify();
      throw new Error("Sessione Spotify scaduta. Effettua nuovamente l'accesso.");
    }

    if (res.ok) {
      const data: SpotifySearchResponse = await res.json();
      const items = data.tracks?.items || [];

      // Score all candidate tracks and select the best match above threshold
      let bestMatch: {
        item: (typeof items)[0];
        score: number;
      } | null = null;

      for (const item of items) {
        const score = scoreTrackMatch(title, artist, item);
        if (
          score >= MIN_MATCH_SCORE_THRESHOLD &&
          (!bestMatch || score > bestMatch.score)
        ) {
          bestMatch = { item, score };
        }
      }

      if (bestMatch) {
        const matchedItem = bestMatch.item;
        const matchedData = {
          found: true,
          spotifyUri: matchedItem.uri,
          spotifyTrackName: matchedItem.name,
          spotifyArtistName: matchedItem.artists.map((a) => a.name).join(", "),
          spotifyAlbumCover: matchedItem.album?.images?.[0]?.url || "",
          spotifyTrackUrl: matchedItem.external_urls?.spotify || "",
          spotifyPreviewUrl: matchedItem.preview_url,
        };

        // Save in cache
        setCachedTrack(title, artist, matchedData);
        return matchedData;
      }
    }
  } catch (err: unknown) {
    if (
      err instanceof SpotifyRateLimitError ||
      (err as Error)?.name === "SpotifyRateLimitError" ||
      err instanceof SpotifyForbiddenError ||
      (err as Error)?.name === "SpotifyForbiddenError" ||
      (err as Error)?.message?.includes("403") ||
      (err as Error)?.message?.includes("Sessione Spotify scaduta")
    ) {
      throw err;
    }
  }

  // Not found - cache negative result
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

  // 1. Create playlist using current Spotify Web API endpoint: POST /v1/me/playlists
  const createRes = await fetch(`${SPOTIFY_API_BASE}/me/playlists`, {
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

  if (!createRes.ok) {
    if (createRes.status === 401) {
      logoutSpotify();
      throw new Error("Sessione Spotify scaduta. Effettua nuovamente l'accesso.");
    }
    if (createRes.status === 403) {
      const errJson = await createRes.json().catch(() => ({}));
      const detail = errJson.error?.message ? ` (${errJson.error.message})` : "";
      throw new SpotifyForbiddenError(
        `Accesso negato da Spotify (403 Forbidden)${detail}: controlla che il tuo account sia autorizzato nella Developer Dashboard di Spotify.`
      );
    }
    const errJson = await createRes.json().catch(() => ({}));
    throw new Error(
      errJson.error?.message ||
        `Impossibile creare la playlist su Spotify (Status: ${createRes.status}).`
    );
  }

  const playlistData = await createRes.json();
  const playlistId = playlistData.id;

  // 2. Filter URIs of found songs
  const urisToAdd = songs
    .filter((s) => s.status === "found" && s.spotifyUri)
    .map((s) => s.spotifyUri as string)
    .filter((u) => u.startsWith("spotify:track:"));

  // 3. Add tracks in batches of max 100 to /v1/playlists/{playlist_id}/items
  let addedCount = 0;
  if (urisToAdd.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < urisToAdd.length; i += chunkSize) {
      const chunk = urisToAdd.slice(i, i + chunkSize);

      // Attempt 1: Standard endpoint POST /v1/playlists/{id}/items with JSON body
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

      // Attempt 2: Legacy fallback POST /v1/playlists/{id}/tracks
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
        if (addRes.status === 401) {
          logoutSpotify();
          throw new Error("Sessione Spotify scaduta. Effettua nuovamente l'accesso.");
        }
        if (addRes.status === 403) {
          throw new SpotifyForbiddenError(
            "Accesso negato da Spotify (403 Forbidden): account non autorizzato o permessi mancanti per aggiungere brani."
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
