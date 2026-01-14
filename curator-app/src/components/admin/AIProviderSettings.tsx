'use client'

import { useState, useEffect } from 'react'

export default function AIProviderSettings() {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini')
  const [documentProcessor, setDocumentProcessor] = useState<'flowise' | 'direct_gemini'>('flowise')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/settings')
        const data = await res.json()
        if (data.ai_provider?.provider) {
          setProvider(data.ai_provider.provider)
        }
        if (data.document_processor?.processor) {
          setDocumentProcessor(data.document_processor.processor)
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, documentProcessor })
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Settings updated successfully` })
      } else {
        throw new Error(data.error || 'Failed to save settings')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>

  return (
    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <span className="mr-2">🤖</span> AI Configuration
      </h2>

      <div className="space-y-6">
        {/* AI Provider Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Active Embedding & LLM Provider
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setProvider('gemini')}
              className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-all ${
                provider === 'gemini'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600 ring-opacity-50'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xl mr-2">♊</span>
              <div className="text-left">
                <div className="font-bold">Google Gemini</div>
                <div className="text-xs opacity-70">768 dimensions</div>
              </div>
            </button>

            <button
              onClick={() => setProvider('openai')}
              className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-all ${
                provider === 'openai'
                  ? 'border-green-600 bg-green-50 text-green-700 ring-2 ring-green-600 ring-opacity-50'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xl mr-2">⭕</span>
              <div className="text-left">
                <div className="font-bold">OpenAI</div>
                <div className="text-xs opacity-70">1536 dimensions</div>
              </div>
            </button>
          </div>
        </div>

        {/* Document Processor Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Processing Provider
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setDocumentProcessor('flowise')}
              className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-all ${
                documentProcessor === 'flowise'
                  ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-600 ring-opacity-50'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xl mr-2">🌊</span>
              <div className="text-left">
                <div className="font-bold">Flowise AI</div>
                <div className="text-xs opacity-70">External service</div>
              </div>
            </button>

            <button
              onClick={() => setDocumentProcessor('direct_gemini')}
              className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-all ${
                documentProcessor === 'direct_gemini'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600 ring-opacity-50'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xl mr-2">🎯</span>
              <div className="text-left">
                <div className="font-bold">Direct Gemini</div>
                <div className="text-xs opacity-70">Built-in processing</div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-700">
          <p className="font-bold mb-1">⚠️ Important Notes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Switching AI providers changes which embedding column is used for RAG queries</li>
            <li>Flowise requires external service configuration and API keys</li>
            <li>Direct Gemini uses built-in processing with no external dependencies</li>
            <li>Ensure you have processed documents with the selected providers for accurate results</li>
          </ul>
        </div>

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gray-900 text-white py-2 rounded-md hover:bg-gray-800 disabled:bg-gray-400 transition-colors font-medium"
        >
          {saving ? 'Saving Configuration...' : 'Apply Changes'}
        </button>
      </div>
    </div>
  )
}
