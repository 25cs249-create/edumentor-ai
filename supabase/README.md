# Supabase Database Setup

Follow these steps to set up PostgreSQL and pgvector for EduMentor AI:

1. **Create/Open a Supabase Project:**
   Go to [database.new](https://database.new) or sign in to [Supabase](https://supabase.com) and create or open your project.

2. **Enable and Run the SQL Migration:**
   - In your Supabase dashboard, navigate to the **SQL Editor**.
   - Open and copy the contents of `supabase/migrations/001_rag.sql`.
   - Paste into the SQL Editor and click **Run** to enable `pgvector`, create the `document_chunks` table, create the HNSW index, and create the `match_document_chunks` function.

3. **Copy the Project URL:**
   - Go to **Project Settings** > **API**.
   - Copy the **Project URL**.

4. **Copy the Service Role Key:**
   - In **Project Settings** > **API**, look for the `service_role` secret key.
   - Copy the secret `service_role` key (keep this secret and server-side only).

5. **Add Values to Local Environment Variables:**
   - In the root of this project, create a `.env.local` file (modeled after `.env.example`).
   - Add:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
     ```

6. **Add the Gemini API Key:**
   - Obtain an API key from Google AI Studio.
   - In `.env.local`, add:
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
