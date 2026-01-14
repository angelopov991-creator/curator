# Flowise Gemini Configuration Instructions

To use Gemini instead of OpenAI in your Flowise flows, follow these steps for each flow:

## 1. Update Credentials
- In Flowise, go to **Credentials**.
- Create a new credential for **Google Generative AI**.
- Paste your Gemini API Key (from Google AI Studio).

## 2. Update Flow 1: Document Processor
- Replace any OpenAI Chat/LLM nodes with **Google Generative AI** nodes (e.g., `gemini-1.5-flash`).
- Select your new Google Generative AI credentials.

## 3. Update Flow 2: Metadata Enricher
- Replace OpenAI Chat nodes with **Google Generative AI** nodes.
- Ensure the prompt still outputs the expected JSON format for metadata.

## 4. Update Flow 3: Vector Embedder
- Replace the **OpenAI Embeddings** node with the **Google Generative AI Embeddings** node.
- Set the model to `text-embedding-004`.
- **Important:** Ensure the dimension is set to **768** (this matches the updated Supabase schema).
- Update the **Supabase Upsert** node if necessary to ensure it's pointing to the correct table and column.

## 5. Update Environment Variables
Ensure your `.env.local` has the correct `GOOGLE_API_KEY` and the Flow IDs match your updated Gemini-based flows.
