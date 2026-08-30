import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiExtractionResponse } from "@/types";

const SYSTEM_PROMPT = `
Sei un assistente esperto nel riconoscimento musicale da immagini.
Il tuo compito è analizzare uno screenshot (come playlist Spotify, Apple Music, YouTube Music, Shazam, note, storie Instagram/TikTok, scalette di concerti, elenchi di brani scritti a mano o digitali) ed estrarre tutti i titoli delle canzoni, i rispettivi artisti e, se visibile o deducibile, l'album.

Regole tassative:
1. Estrai TUTTE le canzoni visibili nell'immagine, mantenendo l'ordine di visualizzazione.
2. Separa con precisione il Titolo della canzone dal Nome dell'artista. Rimuovi numeri di traccia iniziali (es. "1. ", "02 - "), durate (es. "3:45"), etichette come "feat." o "Explicit" dal titolo se appartengono agli artisti.
3. Se l'artista non è chiaramente specificato ma è una canzone celebre o intuibile dal contesto, specificalo. Altrimenti metti stringa vuota o l'artista più probabile.
4. Genera un nome di playlist accattivante e appropriato ("suggestedPlaylistName") basato sul tema, genere, atmosfera o titolo visibile nello screenshot (es. "Hits Estive 2024", "Late Night Vibes", "Rock Classics", "Instagram Story Mix").
5. Rispondi ESCLUSIVAMENTE con un oggetto JSON valido strutturato come segue:
{
  "suggestedPlaylistName": "Nome Playlist Suggerito",
  "songs": [
    {
      "title": "Titolo canzone",
      "artist": "Nome artista",
      "album": "Nome album (opzionale o stringa vuota)"
    }
  ]
}
`;

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

const MAX_ATTEMPTS_PER_MODEL = 2;

// Helper: sleep delay between retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function extractSongsFromImage(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<GeminiExtractionResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY non è configurata o è vuota. Inserisci la tua chiave API di Google AI Studio in .env.local e riavvia il server."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());

  // Clean base64 string
  let cleanBase64 = base64Data;
  if (base64Data.includes("base64,")) {
    cleanBase64 = base64Data.split("base64,")[1];
  } else {
    cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
  }
  cleanBase64 = cleanBase64.trim().replace(/[\r\n\s]+/g, "");

  // Supported Gemini Vision MIME types
  let cleanMimeType = mimeType || "image/jpeg";
  if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(cleanMimeType)) {
    cleanMimeType = "image/jpeg";
  }

  const errorsList: string[] = [];

  // Iterate over models in order of decreasing performance
  for (const modelName of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        console.log(`[Gemini Extraction] Modello: ${modelName} - Tentativo ${attempt}/${MAX_ATTEMPTS_PER_MODEL}...`);

        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const result = await model.generateContent([
          {
            inlineData: {
              data: cleanBase64,
              mimeType: cleanMimeType,
            },
          },
          {
            text: `${SYSTEM_PROMPT}\n\nEstrai tutte le canzoni da questo screenshot e restituisci solo il JSON specificato.`,
          },
        ]);

        const response = await result.response;
        const responseText = response.text();

        if (!responseText) {
          throw new Error("Risposta vuota ricevuta dal modello.");
        }

        // Parse JSON safely
        let parsed: GeminiExtractionResponse;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Impossibile analizzare il payload JSON restituito da Gemini.");
          }
        }

        if (!parsed.songs || !Array.isArray(parsed.songs)) {
          throw new Error("Formato risposta non valido: array 'songs' mancante.");
        }

        // Normalize results
        const cleanedSongs = parsed.songs
          .map((s) => ({
            title: (s.title || "").trim(),
            artist: (s.artist || "").trim(),
            album: (s.album || "").trim(),
          }))
          .filter((s) => s.title.length > 0);

        console.log(`[Gemini Extraction] Successo con modello: ${modelName} (${cleanedSongs.length} brani trovati)`);

        return {
          suggestedPlaylistName:
            (parsed.suggestedPlaylistName || "La mia playlist Snap").trim(),
          songs: cleanedSongs,
        };
      } catch (err: unknown) {
        const error = err as Error;
        const errorMsg = `[${modelName} (tentativo ${attempt})]: ${error.message}`;
        console.warn(errorMsg);
        errorsList.push(errorMsg);

        // If there's another attempt for this model, wait briefly before retrying
        if (attempt < MAX_ATTEMPTS_PER_MODEL) {
          await sleep(500);
        }
      }
    }
  }

  throw new Error(
    `Tutti i tentativi con i modelli Gemini configurati sono falliti:\n${errorsList.join("\n")}`
  );
}
