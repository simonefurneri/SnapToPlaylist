# 📸 SnapToPlaylist (Next.js App Router)

Un'applicazione web moderna costruita con **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Google Gemini Vision AI** e le **Spotify Web API** che converte qualsiasi screenshot contenente titoli di brani musicali in una playlist Spotify funzionante in pochi secondi.

---

## ✨ Funzionalità

1. **Caricamento Screenshot Intelligente**:
   - Drag & Drop dei file immagine.
   - Sfoglia file dal computer (PNG, JPG, WebP, HEIC).
   - **Incolla da Clipboard**: premi `Ctrl + V` ovunque per incollare istantaneamente uno screenshot.
   - **Screenshot di Esempio**: 3 preset realistici (Spotify hits, appunti note, locandine festival) per testare l'app al volo.

2. **Estrazione con Gemini Vision (Server-Side)**:
   - Chiamata sicura ad API route `/api/extract-songs` con modello vision (`gemini-2.5-flash` / `gemini-1.5-flash`).
   - Restituisce un JSON strutturato con `{ songs: [{ title, artist, album }], suggestedPlaylistName }`.
   - Generazione automatica di un nome playlist accattivante e appropriato.

3. **Revisione e Personalizzazione**:
   - Modifica del nome della playlist in tempo reale.
   - Modifica, aggiunta o rimozione di singole tracce estratte.

4. **Autenticazione Spotify PKCE (Zero Secret)**:
   - Flusso OAuth 2.0 *Authorization Code con PKCE* (senza esporre alcun Client Secret nel client).
   - Scopes: `playlist-modify-public`, `playlist-modify-private`, `user-read-private`.
   - Se l'utente ha già una sessione attiva, salta direttamente alla creazione; altrimenti effettua il login e **riprende automaticamente la creazione della playlist al ritorno**.

5. **Matching Tracce e Creazione Playlist**:
   - Ricerca intelligente su Spotify (`/v1/search`) per ogni canzone estratta.
   - Indicatori visivi dedicati:
     - 🟢 **Icona Verde**: Traccia trovata e inserita nella playlist Spotify.
     - 🔴 **Icona Rossa** con tooltip *"Canzone non trovata su Spotify"*: Brani esclusi.
   - Creazione della playlist tramite `/v1/me/playlists` e inserimento dei brani con `/v1/playlists/{id}/tracks`.
   - Feedback di caricamento step-by-step e celebrazione con coriandoli + pulsante diretto *"Apri su Spotify"*.

---

## 🚀 Avvio Rapido

### 1. Clona e installa le dipendenze

```bash
npm install
```

### 2. Configura le variabili d'ambiente

Crea o modifica il file `.env.local`:

```env
# Chiave API Gemini (Gratuita su https://aistudio.google.com/)
GEMINI_API_KEY=tuo_gemini_api_key

# Client ID Spotify (Dashboard https://developer.spotify.com/dashboard)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=tuo_spotify_client_id

# Redirect URI (opzionale, default http://localhost:3000/callback)
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

> **Configurazione Spotify Developer**:
> 1. Vai su [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) e crea un'app.
> 2. Seleziona **Web API**.
> 3. Aggiungi nei Redirect URIs: `http://localhost:3000/callback`.
> 4. Copia il tuo **Client ID** e incollalo in `.env.local` (oppure inseriscilo direttamente dal pulsante *Setup* nell'interfaccia dell'app).

### 3. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel tuo browser.

---

## 🏗️ Architettura del Progetto

```
src/
├── app/
│   ├── api/
│   │   └── extract-songs/
│   │       └── route.ts         # Endpoint server-side Gemini Vision
│   ├── callback/
│   │   └── page.tsx             # OAuth PKCE Callback handler Spotify
│   ├── globals.css              # Tailwind & keyframes
│   ├── layout.tsx               # Root layout & dark theme metadata
│   └── page.tsx                 # Pagina principale unificata
├── components/
│   ├── ImageUploader.tsx        # Drag & drop, file picker & paste
│   ├── Navbar.tsx               # Header con profilo Spotify e setup
│   ├── PlaylistCreatedModal.tsx # Modal successo con link Spotify e confetti
│   ├── SampleScreenshotsModal.tsx # Generatore di screenshot di test
│   ├── SongList.tsx             # Lista canzoni con indicatori verde/rosso
│   └── SpotifySetupModal.tsx    # Modal configurazione rapida Client ID
├── lib/
│   ├── gemini.ts                # Client GoogleGenerativeAI e prompt
│   └── spotify.ts               # Autenticazione PKCE, search e playlist API
└── types/
    └── index.ts                 # Interfacce TypeScript
```
