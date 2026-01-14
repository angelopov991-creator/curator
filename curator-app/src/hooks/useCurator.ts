'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Document,
  DocumentChunk,
  DocumentStats,
  ChunkForReview,
} from '@/types'
import {
  getDocumentStats,
  getChunksForReview,
  getDocument,
} from '@/lib/api/curator'

/**
 * Custom hook for curator workflow state management
 *
 * @param documentId - Document to manage (null = no document loaded)
 * @returns State and actions for curator workflow
 */
export function useCurator(documentId: string | null) {
  const [document, setDocument] = useState<Document | null>(null)
  const [chunks, setChunks] = useState<ChunkForReview[]>([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    filtered: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load document and chunks when documentId changes
  useEffect(() => {
    if (!documentId) {
      setDocument(null)
      setChunks([])
      setStats({ total: 0, approved: 0, rejected: 0, pending: 0, filtered: 0 })
      return
    }

    async function loadData() {
      if (!documentId) return
      
      setLoading(true)
      setError(null)

      try {
        const [docData, chunksData, statsData] = await Promise.all([
          getDocument(documentId),
          getChunksForReview(documentId),
          getDocumentStats(documentId),
        ])

        setDocument(docData)
        setChunks(chunksData)
        setStats(statsData)
        setCurrentChunkIndex(0)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data'
        setError(message)
        console.error('useCurator load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [documentId])

  // Refresh data (after approve/reject)
  const refreshChunks = useCallback(async () => {
    if (!documentId) return

    try {
      const [chunksData, statsData] = await Promise.all([
        getChunksForReview(documentId),
        getDocumentStats(documentId),
      ])

      setChunks(chunksData)
      setStats(statsData)

      // Reset index if we're past the end
      if (currentChunkIndex >= chunksData.length) {
        setCurrentChunkIndex(Math.max(0, chunksData.length - 1))
      }
    } catch (err) {
      console.error('Failed to refresh chunks:', err)
    }
  }, [documentId, currentChunkIndex])

  // Navigation
  const nextChunk = useCallback(() => {
    if (currentChunkIndex < chunks.length - 1) {
      setCurrentChunkIndex((prev) => prev + 1)
    }
  }, [currentChunkIndex, chunks.length])

  const previousChunk = useCallback(() => {
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex((prev) => prev - 1)
    }
  }, [currentChunkIndex])

  const goToChunk = useCallback(
    (index: number) => {
      if (index >= 0 && index < chunks.length) {
        setCurrentChunkIndex(index)
      }
    },
    [chunks.length]
  )

  // Current chunk
  const currentChunk = chunks[currentChunkIndex] || null

  // Progress calculation
  const progress = stats.total > 0 ? (stats.approved + stats.rejected) / stats.total : 0

  return {
    // State
    document,
    chunks,
    currentChunk,
    currentChunkIndex,
    stats,
    loading,
    error,
    progress,

    // Actions
    nextChunk,
    previousChunk,
    goToChunk,
    refreshChunks,

    // Computed
    hasNext: currentChunkIndex < chunks.length - 1,
    hasPrevious: currentChunkIndex > 0,
    isComplete: stats.pending === 0 && stats.total > 0,
    isEmpty: chunks.length === 0,
  }
}

/**
 * Hook for managing document list
 */
export function useDocuments(options?: { refresh?: boolean }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { getDocuments } = await import('@/lib/api/curator')
      const docs = await getDocuments()
      setDocuments(docs)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load documents'
      setError(message)
      console.error('useDocuments error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  return {
    documents,
    loading,
    error,
    refresh: loadDocuments,
  }
}
