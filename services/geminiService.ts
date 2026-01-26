import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    letterDate: { 
        type: Type.STRING,
        description: "The date found on the letter in YYYY-MM-DD format. If no date is found, this should be an empty string."
    },
    senderName: { 
        type: Type.STRING,
        description: "The name of the individual or organization that sent the letter."
    },
    subject: { 
        type: Type.STRING,
        description: "The main subject, title, or a brief summary of the letter's content."
    },
    referenceNumber: { 
        type: Type.STRING,
        description: "Any file reference number, case number, or unique identifier mentioned in the document."
    },
    originatingDivision: { 
        type: Type.STRING,
        description: "The department, division, or office from which the letter originated."
    },
  },
  required: ["letterDate", "senderName", "subject", "referenceNumber", "originatingDivision"]
};


export const extractDocumentDetails = async (imageDataUrl: string): Promise<any> => {
  const base64Data = imageDataUrl.split(',')[1];
  
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: 'image/jpeg',
    },
  };

  const textPart = {
      text: `Analyze the provided document image and extract the following details. If a specific piece of information cannot be found, return an empty string for that field.`
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    // FIX: Trim whitespace from the response text before parsing as JSON.
    const jsonString = response.text?.trim();
    if (!jsonString) {
      throw new Error("Empty response from API");
    }

    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Error extracting document details:", error);
    throw new Error("Failed to extract details from the document. Please try again or enter manually.");
  }
};