import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('settings')
      .select('*')

    if (error) throw error

    // Convert array of settings to object
    const settings: Record<string, any> = {}
    data.forEach(setting => {
      settings[setting.key] = setting.value
    })

    return NextResponse.json(settings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { provider, documentProcessor } = body

    // Handle AI provider setting
    if (provider !== undefined) {
      if (!['gemini', 'openai'].includes(provider)) {
        return NextResponse.json({ error: 'Invalid AI provider' }, { status: 400 })
      }

      const { error: providerError } = await supabase
        .from('settings')
        .upsert({
          key: 'ai_provider',
          value: { provider },
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })

      if (providerError) throw providerError
    }

    // Handle document processor setting
    if (documentProcessor !== undefined) {
      if (!['flowise', 'direct_gemini'].includes(documentProcessor)) {
        return NextResponse.json({ error: 'Invalid document processor' }, { status: 400 })
      }

      const { error: processorError } = await supabase
        .from('settings')
        .upsert({
          key: 'document_processor',
          value: { processor: documentProcessor },
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })

      if (processorError) throw processorError
    }

    return NextResponse.json({
      success: true,
      provider,
      documentProcessor
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
