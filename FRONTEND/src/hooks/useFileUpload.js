// src/hooks/useFileUpload.js
// Handles PDF text extraction + code/text files

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Point to the PDF worker bundled with pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const MAX_CHARS = 12000; // keep it within Groq's context

export function useFileUpload() {
  const [uploadedFile, setUploadedFile] = useState(null); // { name, content, type }
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      fullText += `\n[Page ${i}]\n${pageText}`;
      if (fullText.length > MAX_CHARS) break; // stop if too large
    }

    return fullText.slice(0, MAX_CHARS);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setExtracting(true);

    try {
      const isPDF = file.type === "application/pdf";
      const isText = !isPDF; // everything else read as text

      let content = "";

      if (isPDF) {
        content = await extractPdfText(file);
      } else if (isText) {
        content = await file.text();
        content = content.slice(0, MAX_CHARS);
      }

      setUploadedFile({
        name: file.name,
        content,
        type: isPDF ? "pdf" : "text",
        size: (file.size / 1024).toFixed(1) + " KB",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to read file. Try a different file.");
    } finally {
      setExtracting(false);
    }
  };

  const clearFile = () => setUploadedFile(null);

  return { uploadedFile, extracting, error, handleFile, clearFile };
}