
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeImageWithAI = async (
  base64Image: string,
  mimeType: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Act as a Tier-3 Digital Forensics Investigator. Perform an exhaustive steganographic audit on this image.
    
    CRITICAL INSPECTION CRITERIA:
    1. SCATTERED LSB PROTOCOL: Check for pseudo-random noise distribution across ALL bit-planes (R,G,B bits 0-2).
    2. ENTROPY ANOMALIES: Does the noise floor vary unnaturally in smooth vs. textured regions?
    3. ENCRYPTION ARTIFACTS: High-entropy LSB data often suggests encrypted payloads (AES/GCM). 
    4. HISTOGRAM ATTACK: Are there "pair of values" artifacts in the color frequency distribution?
    
    If you suspect hidden data, characterize the suspected protocol (Sequential vs Scattered).
    Respond ONLY in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
            },
            reasoning: { type: Type.STRING },
            anomalies: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
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
              items: { type: Type.STRING }
            }
          },
          required: ["likelihood", "reasoning", "anomalies", "suggestions"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("AI Reasoning Engine offline.");
  }
};
