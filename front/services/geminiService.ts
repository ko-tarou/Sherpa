
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;

// APIキーが設定されている場合のみ初期化
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.warn('Failed to initialize Gemini API:', error);
  }
}

export const generateSmartTasks = async (eventTitle: string) => {
  // APIキーが設定されていない場合は空配列を返す
  if (!ai || !apiKey) {
    console.warn('Gemini API key is not set. AI task generation is disabled.');
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 high-priority tasks for an event titled "${eventTitle}". 
      Format them as a JSON array of objects with "title" and "deadline" (e.g., "残り 2日" or "本日締め切り").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              deadline: { type: Type.STRING }
            },
            required: ["title", "deadline"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text.trim());
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return [];
    }
  } catch (error) {
    console.error("Failed to generate AI tasks", error);
    return [];
  }
};
