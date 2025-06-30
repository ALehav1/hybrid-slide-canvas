import OpenAI from "openai";

// Vite exposes env variables on the special `import.meta.env` object.
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    "OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file."
  );
}

export const openai = new OpenAI({
  apiKey: apiKey,
  // This is required for client-side usage of the OpenAI API
  dangerouslyAllowBrowser: true,
});
