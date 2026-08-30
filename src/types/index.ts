export interface ExtractedSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  status?: 'pending' | 'searching' | 'found' | 'not_found';
  spotifyUri?: string;
  spotifyTrackName?: string;
  spotifyArtistName?: string;
  spotifyAlbumCover?: string;
  spotifyTrackUrl?: string;
  spotifyPreviewUrl?: string | null;
}

export interface GeminiExtractionResponse {
  songs: Array<{
    title: string;
    artist: string;
    album?: string;
  }>;
  suggestedPlaylistName: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{ url: string; height: number; width: number }>;
  external_urls?: { spotify: string };
  product?: string;
}

export interface SpotifyTrackItem {
  id: string;
  name: string;
  uri: string;
  preview_url: string | null;
  external_urls: { spotify: string };
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
}

export interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyTrackItem[];
    total: number;
  };
}

export interface CreatedPlaylistResult {
  id: string;
  name: string;
  description: string;
  external_urls: { spotify: string };
  uri: string;
  totalTracksAdded: number;
  totalTracksFound: number;
  totalTracksRequested: number;
  imageUrl?: string;
}
