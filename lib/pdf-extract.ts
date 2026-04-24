// pdfjs-dist's non-legacy build uses DOMMatrix which is not a global in Node.js.
// Polyfill it before any pdfjs import so the legacy build can also init cleanly.
function polyfillDOMMatrix() {
  if (typeof globalThis.DOMMatrix !== "undefined") return;
  (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: number[]) {
      if (Array.isArray(init) && init.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init as [
          number, number, number, number, number, number,
        ];
      }
    }
    translateSelf(tx: number, ty = 0) {
      this.e = this.a * tx + this.c * ty + this.e;
      this.f = this.b * tx + this.d * ty + this.f;
      return this;
    }
    scaleSelf(sx: number, sy = sx) {
      this.a *= sx; this.b *= sx; this.c *= sy; this.d *= sy;
      return this;
    }
  };
}

polyfillDOMMatrix();

// Use the pdfjs-dist *legacy* build — recommended for Node.js environments.
// It avoids the "Please use the legacy build" warning and doesn't assume
// modern browser globals beyond what we polyfill above.
type PdfjsLib = typeof import("pdfjs-dist");

let ready: Promise<PdfjsLib> | null = null;

async function init(): Promise<PdfjsLib> {
  const lib = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsLib;

  // Registering WorkerMessageHandler on globalThis.pdfjsWorker makes PDF.js use
  // the worker handler directly on the main thread. No real Worker is spawned and
  // no dynamic workerSrc import happens, so there is no version-mismatch between
  // main-thread and worker code (the root cause of the "docParams undefined" error).
  if (!(globalThis as Record<string, unknown>).pdfjsWorker) {
    const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.mjs")) as {
      WorkerMessageHandler: unknown;
    };
    (globalThis as Record<string, unknown>).pdfjsWorker = worker;
  }

  return lib;
}

export async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const lib = await (ready ??= init());

  const loadingTask = lib.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableFontFace: true,
    useSystemFonts: true,
    isEvalSupported: false,
    verbosity: 0,
  });

  const doc = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
        .join(""),
    );
  }

  await doc.destroy();
  return pages.join("\n");
}
