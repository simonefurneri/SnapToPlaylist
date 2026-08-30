import { NextRequest, NextResponse } from "next/server";
import { extractSongsFromImage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow sufficient time for vision processing

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let base64Data = "";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "Nessun file immagine fornito nella richiesta." },
          { status: 400 }
        );
      }

      mimeType = file.type || "image/jpeg";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Data = buffer.toString("base64");
    } else {
      const body = await request.json();
      if (!body.image) {
        return NextResponse.json(
          { error: "Campo 'image' mancante (previsto base64 string o data URL)." },
          { status: 400 }
        );
      }
      base64Data = body.image;
      if (body.mimeType) {
        mimeType = body.mimeType;
      }
    }

    if (!base64Data) {
      return NextResponse.json(
        { error: "Dati immagine non validi o vuoti." },
        { status: 400 }
      );
    }

    const result = await extractSongsFromImage(base64Data, mimeType);

    if (result.songs.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nessuna canzone rilevata nello screenshot. Assicurati che il testo sia leggibile e riprova.",
          suggestedPlaylistName: result.suggestedPlaylistName,
          songs: [],
        },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Errore in /api/extract-songs:", error);

    let statusCode = 500;
    let errorMessage = error.message || "Errore sconosciuto durante l'analisi dell'immagine.";

    if (errorMessage.includes("GEMINI_API_KEY")) {
      statusCode = 500;
    } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      statusCode = 429;
      errorMessage = "Limite di richieste Gemini raggiunto. Attendi qualche istante e riprova.";
    }

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
