import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approveChunk, rejectChunk } from '@/lib/api/curator'

export async function POST(
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
    const { action, notes } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    try {
      if (action === 'approve') {
        await approveChunk(id, notes || '', user.id)
        return NextResponse.json({
          success: true,
          message: 'Chunk approved successfully',
        })
      } else {
        await rejectChunk(id, user.id)
        return NextResponse.json({
          success: true,
          message: 'Chunk rejected successfully',
        })
      }
    } catch (error) {
      console.error(`Chunk ${action} error:`, error)
      return NextResponse.json(
        {
          error: `Failed to ${action} chunk: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
