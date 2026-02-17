
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeImageWithAI = async (
  base64Image: string,
  mimeType: string
): Promise<AnalysisResult> => {
  // Fix: Initializing strictly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Perform a forensic steganography analysis on this image. 
    Act as a digital forensics expert. Look for:
    1. Visual artifacts consistent with LSB (Least Significant Bit) insertion.
    2. Inconsistent noise patterns (especially high-frequency noise in smooth areas).
    3. Compression anomalies or unusual color distributions.
    4. Any signs of hidden patterns, grids, or messages.

    If you detect clear signs of manipulation, provide detailed reasoning.
    If the image looks clean, explain why it might be safe but note the limitations of visual analysis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            likelihood: {
              type: Type.STRING,
              enum: ['Low', 'Medium', 'High', 'Detected'],
              description: "The estimated likelihood of hidden data being present."
            },
            reasoning: {
              type: Type.STRING,
              description: "Detailed expert analysis of the image features."
            },
            anomalies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of specific visual or technical anomalies detected."
            },
            metadata: {
              type: Type.OBJECT,
              properties: {
                format: { type: Type.STRING },
                estimatedEntropy: { type: Type.STRING }
              }
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Recommended next steps for further investigation."
            }
          },
          required: ["likelihood", "reasoning", "anomalies", "suggestions"]
        }
      }
    });

    // Fix: Using response.text property directly
    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to perform AI forensics analysis.");
  }
};
