export const runtime = "nodejs";

import { PDFParse } from "pdf-parse";

const MAX_TEXT_CHARS = 12_000;

function getToneInstruction(tone: string) {
  if (tone === "gentle") {
    return "Keep it playful and supportive. Limit sarcasm.";
  }
  if (tone === "brutal") {
    return "Be very direct and sharp, but do not insult protected characteristics.";
  }
  return "Be funny and witty, but helpful.";
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing GROQ_API_KEY environment variable." },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const tone = String(formData.get("tone") ?? "funny");
    const pastedText = String(formData.get("resumeText") ?? "").trim();
    const uploadedFile = formData.get("resumeFile");

    let fileText = "";
    if (uploadedFile instanceof File && uploadedFile.size > 0) {
      const isTextFile = uploadedFile.type.startsWith("text/") || uploadedFile.name.endsWith(".txt");
      const isPdfFile =
        uploadedFile.type === "application/pdf" || uploadedFile.name.toLowerCase().endsWith(".pdf");
      if (!isTextFile && !isPdfFile) {
        return Response.json(
          {
            error:
              "Unsupported file type for this demo. Use a .pdf/.txt file or paste resume text directly.",
          },
          { status: 400 },
        );
      }

      if (isPdfFile) {
        try {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
          const result = await parser.getText();
          fileText = result.text;
        } catch {
          return Response.json(
            {
              error:
                "Could not read that PDF. Try a different file, export PDF again, or paste the resume text instead.",
            },
            { status: 400 },
          );
        }
      } else {
        fileText = await uploadedFile.text();
      }
    }

    const resumeText = `${pastedText}\n${fileText}`.trim().slice(0, MAX_TEXT_CHARS);
    if (!resumeText) {
      return Response.json(
        { error: "Provide resume text by upload or paste." },
        { status: 400 },
      );
    }

    const prompt = [
      "You are a resume coach doing a roast for a demo app.",
      "Output plain text only, no markdown.",
      "Structure exactly in these sections with headings:",
      "1) Roast (5 bullet points)",
      "2) Recruiter Reality Check (3 bullet points)",
      "3) Instant Fixes (5 rewritten bullet examples)",
      "4) 30-Second Elevator Pitch (3 lines)",
      "Keep it concise and specific to the provided resume.",
      getToneInstruction(tone),
      "",
      "Resume content:",
      resumeText,
    ].join("\n");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700,
      }),
    });

    const rawGroq = await response.text();
    if (!response.ok) {
      return Response.json(
        { error: `Groq request failed: ${rawGroq}` },
        { status: 500 },
      );
    }

    type GroqChatBody = { choices?: { message?: { content?: string } }[] };
    let groqBody: GroqChatBody;
    try {
      groqBody = JSON.parse(rawGroq) as GroqChatBody;
    } catch {
      return Response.json(
        { error: "Groq returned an unexpected non-JSON response." },
        { status: 500 },
      );
    }

    const roast = groqBody.choices?.[0]?.message?.content?.trim();

    if (!roast) {
      return Response.json(
        { error: "Groq returned an empty response." },
        { status: 500 },
      );
    }

    return Response.json({ roast });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
