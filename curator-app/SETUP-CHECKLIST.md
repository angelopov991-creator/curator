# Setup Checklist

Use this checklist to ensure all required steps are completed before running the application.

## Phase 1: Supabase Setup ✅

### Create Supabase Project
- [ ] Sign up/login to [supabase.com](https://supabase.com)
- [ ] Create new project
- [ ] Wait for project to be fully provisioned
- [ ] Note your project URL (e.g., `https://bwgaqrfedfypinacnomq.supabase.co`)

### Database Migration
- [ ] Go to Supabase Dashboard > SQL Editor
- [ ] Copy contents of `supabase/migrations/001_initial_schema.sql`
- [ ] Paste and execute SQL script
- [ ] Verify tables created: `profiles`, `documents`, `document_chunks`, `kb_vectors`
- [ ] Verify functions created: `increment_approved_chunks`, `increment_rejected_chunks`
- [ ] Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`

### Storage Setup
- [ ] Go to Supabase Dashboard > Storage
- [ ] Click "Create a documentsnew bucket"
- [ ] Name: ``
- [ ] Public bucket: ✅ (checked)
- [ ] Click "Create bucket"
- [ ] Note: File upload will fail without this bucket

### Get API Keys
- [ ] Go to Supabase Dashboard > Settings > API
- [ ] Copy `Project URL`
- [ ] Copy `anon` public key
- [ ] Copy `service_role` secret key (⚠️ keep this secure)

## Phase 2: Environment Configuration

### Update .env.local
- [ ] Open `.env.local` file
- [ ] Add your Supabase project URL to `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add your anon key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add your service role key to `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

### Environment Variables Template
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
FLOWISE_API_ENDPOINT=your-flowise-endpoint
FLOWISE_API_KEY=your-flowise-api-key
OPENAI_API_KEY=your-openai-api-key (optional)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Phase 3: FlowiseAI Setup (Optional - for AI features)

### Create FlowiseAI Account
- [ ] Sign up at [flowiseai.com](https://flowiseai.com)
- [ ] Create organization
- [ ] Note API credentials

### Configure Flowise Flows (Future Step)
- [ ] Document Processing Flow
- [ ] Metadata Enrichment Flow
- [ ] Vector Embedding Flow
- [ ] Add credentials to `.env.local`

**Note**: You can run the app without FlowiseAI initially - document upload and manual review will work, but AI processing won't be available.

## Phase 4: Install and Run

### Install Dependencies
- [ ] Run: `npm install`

### Start Development Server
- [ ] Run: `npm run dev`
- [ ] Open: http://localhost:3000
- [ ] Verify homepage loads

## Phase 5: Create First Admin User

### Register Account
- [ ] Go to http://localhost:3000/register
- [ ] Create account with email/password
- [ ] Note: New users default to 'user' role with limited access

### Promote to Admin
- [ ] Go to Supabase Dashboard > Authentication > Users
- [ ] Find your newly created user
- [ ] Copy the User ID
- [ ] Go to SQL Editor and run:

```sql
UPDATE profiles
SET role = 'admin', is_active = true
WHERE id = 'your-user-id-here';
```

- [ ] Refresh the app
- [ ] Verify you can access Admin panel

## Phase 6: Test Core Features

### Test Authentication
- [ ] Log out and log back in
- [ ] Verify role displays in navigation

### Test Document Upload (Admin/Curator only)
- [ ] Upload a test PDF/DOCX file
- [ ] Provide title and document type
- [ ] Verify upload succeeds
- [ ] Check document appears in Documents list

### Test Document Processing
- [ ] Click "Process" on uploaded document
- [ ] Verify status changes to "processing"
- [ ] Wait for processing to complete
- [ ] Verify status changes to "needs_review"

### Test Chunk Review
- [ ] Click "Review Chunks" on processed document
- [ ] Review generated chunks
- [ ] Try approving a chunk
- [ ] Try rejecting a chunk

### Test Admin Panel
- [ ] Go to /admin
- [ ] Verify system statistics display
- [ ] Check user management section

## Phase 7: Troubleshooting

### Common Issues

#### Database Connection Error
- [ ] Verify Supabase URL and keys in `.env.local`
- [ ] Check migration was run successfully
- [ ] Ensure RLS policies are active

#### Upload Fails
- [ ] Verify `documents` storage bucket exists
- [ ] Check bucket is set to public
- [ ] Verify file size < 50MB
- [ ] Check file type is PDF, DOCX, or TXT

#### Processing Fails
- [ ] Verify FlowiseAI credentials (if using)
- [ ] Check Flowise instance is running
- [ ] Review server logs in terminal

#### Can't Access Protected Routes
- [ ] Verify user has 'curator' or 'admin' role
- [ ] Check `is_active = true` in profiles table
- [ ] Clear browser cookies and login again

### Getting Help
- Check terminal output for error messages
- Review Supabase Dashboard logs
- Check browser console for client-side errors

## Phase 8: Production Deployment (Future)

### Prepare for Production
- [ ] Add production environment variables
- [ ] Test all features in staging environment
- [ ] Review security settings
- [ ] Set up monitoring and logging

### Deploy to Vercel
- [ ] Push code to GitHub
- [ ] Connect repository to Vercel
- [ ] Add environment variables in Vercel
- [ ] Deploy and test

## ✅ Completion

Once all items above are checked:
- ✅ Application is fully functional
- ✅ Database schema is set up
- ✅ Authentication works
- ✅ Document upload/processing works
- ✅ Admin panel is accessible
- ✅ You're ready for development or production use

## Next Steps

After setup is complete:
1. Review the main [README.md](README.md) for detailed documentation
2. Explore the codebase to understand the architecture
3. Configure FlowiseAI flows for full AI functionality
4. Customize the UI and branding as needed
5. Deploy to production when ready

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase documentation
3. Check Next.js documentation
4. Consult FlowiseAI documentation (if using AI features)
