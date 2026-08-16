
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

// Initialize the Google GenAI client with the API key from environment variables.
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || 'missing-api-key' });

export const analyzeFinancialData = async (transactions: Transaction[]) => {
  try {
    const dataString = JSON.stringify(transactions);
    // Use gemini-3-flash-preview for general text analysis tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As a professional accountant, analyze the following transactions and provide a summary of financial performance, spending habits, and tax considerations. Format the response as a clear, professional report with sections for 'Summary', 'Key Insights', and 'Recommendations'.\n\nData: ${dataString}`,
    });

    // Access the text property directly from the response object.
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to generate financial analysis. Please check your API key or data.";
  }
};

export const categorizeTransaction = async (description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Categorize this transaction description into a standard accounting category: "${description}". Return only the category name.`,
      config: {
        maxOutputTokens: 50,
      }
    });
    // Access the text property directly and handle potential undefined results.
    return response.text?.trim() || "Uncategorized";
  } catch (error) {
    return "Uncategorized";
  }
};
