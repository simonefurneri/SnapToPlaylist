"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Trash2,
  ClipboardPaste,
} from "lucide-react";

interface ImageUploaderProps {
  onAnalyzeImage: (fileOrBase64: File | string, mimeType?: string) => Promise<void>;
  isLoading: boolean;
}

export function ImageUploader({
  onAnalyzeImage,
  isLoading,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Per favore seleziona un file immagine valido (PNG, JPG, WebP, ecc.)");
      return;
    }

    setSelectedFile(file);
    setFileDetails({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
      setBase64Data(result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Listen to clipboard paste events globally (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isLoading) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isLoading, processFile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setBase64Data(null);
    setFileDetails(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (selectedFile) {
      await onAnalyzeImage(selectedFile);
    } else if (base64Data) {
      await onAnalyzeImage(base64Data, "image/png");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {!previewUrl ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-12 text-center cursor-pointer transition-all duration-300 ease-out ${
            dragActive
              ? "border-[#1DB954] bg-[#1DB954]/10 scale-[1.01] shadow-2xl shadow-[#1DB954]/20"
              : "border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/70 hover:shadow-xl"
          } backdrop-blur`}
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1DB954]/5 via-transparent to-transparent rounded-3xl pointer-events-none" />

          <div className="flex flex-col items-center justify-center gap-4 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-white shadow-lg transition-transform duration-300 hover:scale-105">
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-[#1DB954]" />
            </div>

            <div className="space-y-1.5 px-2">
              <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
                Carica o trascina qui il tuo screenshot
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                Tocca per selezionare una foto dalla galleria oppure premi{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[10px] sm:text-[11px] text-neutral-200">
                  Ctrl + V
                </kbd>{" "}
                per incollare direttamente.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1 bg-neutral-900/80 px-2.5 py-1 rounded-full border border-neutral-800">
                <ImageIcon className="w-3 h-3 text-[#1DB954]" /> PNG, JPG, WebP, HEIC
              </span>
              <span className="flex items-center gap-1 bg-neutral-900/80 px-2.5 py-1 rounded-full border border-neutral-800">
                <ClipboardPaste className="w-3 h-3 text-cyan-400" /> Incolla da appunti
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Preview State */
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Thumbnail */}
            <div className="relative group w-full sm:w-44 h-48 sm:h-44 rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 flex-shrink-0 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Anteprima screenshot"
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-all duration-200 cursor-pointer"
                  title="Cambia immagine"
                >
                  Cambia
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 transition-all duration-200 cursor-pointer"
                  title="Rimuovi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info & Action */}
            <div className="flex-1 text-center sm:text-left space-y-3 w-full">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#1DB954] uppercase tracking-wider">
                    Screenshot Selezionato
                  </span>
                  {fileDetails && (
                    <span className="text-xs text-neutral-500 font-mono">
                      {fileDetails.size}
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white truncate max-w-sm">
                  {fileDetails?.name || "Screenshot musicale"}
                </h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Gemini AI analizzerà lo screenshot per estrarre tutti i brani e proporre un titolo per la playlist.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleAnalyze}
                  className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-[#1DB954] via-emerald-500 to-cyan-500 hover:from-[#1ed760] hover:to-cyan-400 text-neutral-950 font-bold text-sm transition-all duration-300 shadow-lg shadow-[#1DB954]/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analisi Gemini in corso...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-neutral-950" />
                      <span>Estrai Canzoni con Gemini</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleClear}
                  className="py-3 px-4 rounded-2xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 border border-neutral-700/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold"
                  title="Cancella"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sm:hidden">Rimuovi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
