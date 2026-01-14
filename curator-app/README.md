# Knowledge Base Curator Module

A Next.js application for managing document uploads, AI processing, and curator review workflows for a RAG-based knowledge base.

## Features

- **User Authentication**: Email/password authentication with role-based access control (User, Curator, Admin)
- **Document Management**: Upload documents (PDF, DOCX, TXT) up to 50MB
- **AI Processing**: Integration with FlowiseAI Cloud for document chunking, metadata enrichment, and vector embedding
- **Curator Workflow**: Review and approve AI-generated chunks before they enter the knowledge base
- **Admin Panel**: Manage users, curators, and system statistics
- **Vector Search Ready**: Stores approved chunks in a vector database for RAG applications

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI Processing**: FlowiseAI Cloud
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Prerequisites

Before you begin, ensure you have:

1. **Supabase Account**: Create a project at [supabase.com](https://supabase.com)
2. **FlowiseAI Cloud Account**: Sign up at [flowiseai.com](https://flowiseai.com)
3. **OpenAI API Key**: For AI processing (optional, depends on Flowise flows)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

#### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Note your project URL and API keys from Settings > API

#### Run Database Migration

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL script
5. This will create all necessary tables, functions, and RLS policies

#### Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Click "Create a new bucket"
3. Name it `documents`
4. Set it to public (required for file access)
5. Click "Create bucket"

#### Enable pgvector Extension

1. Go to SQL Editor in Supabase
2. Run: `CREATE EXTENSION IF NOT EXISTS vector;`

### 3. Configure FlowiseAI

#### Set Up FlowiseAI Cloud Account

1. Sign up at [flowiseai.com](https://flowiseai.com)
2. Create a new organization
3. Note your API credentials

#### Configure Environment Variables

Update `.env.local` with your FlowiseAI credentials (see Environment Variables section below)

### 4. Environment Configuration

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# FlowiseAI Configuration
FLOWISE_API_ENDPOINT=https://your-flowise-instance.com
FLOWISE_API_KEY=your-flowise-api-key

# OpenAI Configuration (optional, depends on Flowise flows)
OPENAI_API_KEY=your-openai-api-key

# Site URL (for redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Default User Creation

Since this application requires specific user roles, you'll need to manually create the first admin user:

1. Register a new account through the app
2. Go to your Supabase dashboard > Authentication > Users
3. Find your user and note the User ID
4. Go to SQL Editor and run:

```sql
UPDATE profiles
SET role = 'admin', is_active = true
WHERE id = 'your-user-id-here';
```

## User Roles

- **User**: Can view documents (future feature)
- **Curator**: Can upload documents, review chunks, approve/reject content
- **Admin**: All curator permissions plus user management and system statistics

## Workflow

### For Curators:

1. **Upload Document**
   - Navigate to Upload page
   - Select file (PDF, DOCX, or TXT)
   - Provide title and document type
   - Click Upload

2. **Process Document**
   - Click "Process" on uploaded document
   - AI will chunk and enrich the document
   - Document moves to "needs_review" status

3. **Review Chunks**
   - Navigate to Review page
   - Review each chunk with AI-generated metadata
   - Approve or reject chunks
   - Add curator notes for approved chunks

4. **Monitor Progress**
   - Check dashboard for statistics
   - Track document processing status

### For Admins:

1. **User Management**
   - View all users and their roles
   - Activate/deactivate users
   - Promote users to curators

2. **System Monitoring**
   - View system statistics
   - Monitor document and chunk counts
   - Track processing status

## API Endpoints

### Authentication
- `POST /api/auth/signout` - Sign out user

### Documents
- `POST /api/documents/upload` - Upload new document
- `POST /api/documents/[id]/process` - Process uploaded document

### Chunk Review
- `POST /api/chunks/[id]/review` - Approve or reject chunk

## Database Schema

The application uses the following main tables:

- **profiles**: User profiles with roles and status
- **documents**: Uploaded documents with metadata
- **document_chunks**: AI-generated chunks awaiting review
- **kb_vectors**: Approved chunks ready for vector search

See `supabase/migrations/001_initial_schema.sql` for complete schema.

## Security Features

- **Row Level Security (RLS)**: All tables have RLS policies
- **Role-based Access Control**: API endpoints check user roles
- **File Validation**: Upload validation for file types and sizes
- **Authentication Required**: All protected routes require valid session

## Development

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (protected)/        # Protected routes (require auth)
│   ├── api/                # API routes
│   └── auth/               # Auth pages
├── components/             # React components
│   ├── auth/              # Authentication components
│   └── curator/           # Curator workflow components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
│   ├── api/               # Business logic
│   ├── auth/              # Authentication helpers
│   └── supabase/          # Supabase clients
└── types/                  # TypeScript type definitions
```

### Adding New Features

1. Create components in `src/components/`
2. Add API routes in `src/app/api/`
3. Update types in `src/types/`
4. Add business logic to `src/lib/api/`

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:

- All Supabase keys
- FlowiseAI credentials
- OpenAI API key (if using)
- Site URL (set to your production domain)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify Supabase URL and keys
   - Ensure database migration was run
   - Check RLS policies are active

2. **Upload Fails**
   - Verify storage bucket exists and is public
   - Check file size (max 50MB)
   - Ensure file type is supported (PDF, DOCX, TXT)

3. **Processing Fails**
   - Verify FlowiseAI credentials
   - Check FlowiseAI instance is running
   - Review server logs for errors

4. **Authentication Issues**
   - Clear browser cookies and try again
   - Verify site URL is correct in environment
   - Check Supabase Auth settings

### Getting Help

- Check the [Supabase documentation](https://supabase.com/docs)
- Review [Next.js documentation](https://nextjs.org/docs)
- Consult [FlowiseAI documentation](https://docs.flowiseai.com)

## License

This project is proprietary software developed for internal use.
