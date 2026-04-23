import { GoogleGenAI } from "@google/genai";
import { DocumentMetadata } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are the Biohacking Lab Research Assistant for middle/high school students.
Your core mission is to provide accurate, grounded information about biological science based ONLY on a repository of uploaded PDFs.

CRITICAL RULES:
1. NO HALLUCINATION: You MUST ONLY use the provided text segments to answer. 
2. If the answer is not contained within the provided documents, you MUST say: "I'm sorry, but the provided literature does not mention this information."
3. STRICT SOURCING: Every sentence or fact must be cited. Use the format: [Document Name, Page X].
4. FORMAT: Use a clear, encouraging tone for students. Use Markdown for formatting (bold, lists).

PROVIDED KNOWLEDGE BASE:
{{DOCS}}

STUDENT QUESTION:
{{QUESTION}}

RESPONSE (IN ENGLISH, WITH CITATIONS):
`;

export async function askQuestion(question: string, docs: DocumentMetadata[]) {
  // Aggregate document content for the prompt
  // In a production app with huge documents, we'd use vector search.
  // Here, with 25 docs and 2M token context, we can construct a large prompt.
  const docsText = docs.map(d => `--- DOCUMENT: ${d.name} ---\n${d.text}`).join('\n\n');
  
  const prompt = SYSTEM_PROMPT.replace('{{DOCS}}', docsText).replace('{{QUESTION}}', question);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1, // Low temperature for high grounding
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate response from biological knowledge base.");
  }
}
