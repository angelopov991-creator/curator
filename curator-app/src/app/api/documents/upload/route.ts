import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadDocument } from '@/lib/api/curator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has curator or admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['curator', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const documentType = formData.get('documentType') as string
    const description = formData.get('description') as string

    if (!file || !title || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Cast documentType to DocType
    const docType = documentType as any

    // First upload the file
    const uploadResult = await uploadDocument(file, docType)

    // Update the document with additional metadata
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        title,
        document_type: documentType,
        description,
        processing_status: 'draft'
      })
      .eq('id', uploadResult.documentId)

    if (updateError) {
      console.error('Failed to update document metadata:', updateError)
      // Still return the document ID, metadata update can be retried
    }

    return NextResponse.json({ documentId: uploadResult.documentId })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
