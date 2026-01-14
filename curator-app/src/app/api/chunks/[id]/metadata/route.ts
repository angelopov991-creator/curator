import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChunkAIMetadata } from '@/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

    const body = await request.json()
    const { metadata }: { metadata: Partial<ChunkAIMetadata> } = body

    if (!metadata) {
      return NextResponse.json(
        { error: 'Metadata is required' },
        { status: 400 }
      )
    }

    // Get current chunk data
    const { data: currentChunk, error: fetchError } = await supabase
      .from('document_chunks')
      .select('ai_metadata')
      .eq('id', id)
      .single()

    if (fetchError || !currentChunk) {
      return NextResponse.json(
        { error: 'Chunk not found' },
        { status: 404 }
      )
    }

    // Merge new metadata with existing
    const updatedMetadata = {
      ...currentChunk.ai_metadata,
      ...metadata,
      last_updated: new Date().toISOString(),
    }

    // Update chunk metadata
    const { error: updateError } = await supabase
      .from('document_chunks')
      .update({
        ai_metadata: updatedMetadata,
        metadata_edited: true,
        metadata_edited_by: user.id,
        metadata_edited_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Metadata update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Metadata updated successfully',
      metadata: updatedMetadata,
    })
  } catch (error) {
    console.error('Metadata update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}