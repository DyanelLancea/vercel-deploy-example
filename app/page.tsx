"use client";

import { FormEvent, useMemo, useState } from "react";

type RoastResponse = {
  roast: string;
};

const MAX_CHARS = 12_000;

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [tone, setTone] = useState("funny");
  const [roast, setRoast] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const remainingChars = useMemo(() => MAX_CHARS - resumeText.length, [resumeText]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setRoast("");

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as RoastResponse | { error: string };

      if (!response.ok || !("roast" in body)) {
        setError("error" in body ? body.error : "Failed to roast resume.");
        return;
      }

      setRoast(body.roast);
    } catch {
      setError("Something went wrong while contacting the roast engine.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Hackathon Demo</p>
        <h1 className="text-4xl font-bold tracking-tight">AI Roast My Resume</h1>
        <p className="max-w-3xl text-zinc-600 dark:text-zinc-300">
          Upload a PDF/text resume or paste your content. The AI gives a playful roast and a practical upgrade
          plan.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="space-y-2">
          <label htmlFor="resume-file" className="block text-sm font-semibold">
            Resume File (optional, .pdf or .txt)
          </label>
          <input
            id="resume-file"
            name="resumeFile"
            type="file"
            accept=".pdf,application/pdf,.txt,text/plain"
            className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-white hover:file:bg-zinc-700 dark:file:bg-zinc-100 dark:file:text-black dark:hover:file:bg-zinc-300"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="resume-text" className="block text-sm font-semibold">
            Or paste resume text
          </label>
          <textarea
            id="resume-text"
            name="resumeText"
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value.slice(0, MAX_CHARS))}
            placeholder="Paste your resume content here..."
            className="min-h-64 w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-sm outline-none ring-0 transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="text-xs text-zinc-500">{remainingChars} characters remaining</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="tone" className="block text-sm font-semibold">
            Roast intensity
          </label>
          <select
            id="tone"
            name="tone"
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="gentle">Gentle (still kind)</option>
            <option value="funny">Funny (default)</option>
            <option value="brutal">Brutal (no mercy)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {isLoading ? "Roasting..." : "Roast My Resume"}
        </button>
      </form>

      {error ? (
        <section className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </section>
      ) : null}

      {roast ? (
        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xl font-semibold">Your Roast + Rewrite Plan</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-zinc-700 dark:text-zinc-200">
            {roast}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
