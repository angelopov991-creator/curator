import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Document {
  id: string
  title: string
  document_type: string
  status: string
  total_chunks: number
  approved_chunks: number
  created_at: string
  profiles: {
    email: string
  }
}

async function getDocuments(): Promise<Document[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      profiles!documents_uploaded_by_fkey(email)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return []
  }

  return data || []
}

function getStatusBadge(status: string) {
  const styles = {
    draft: 'bg-gray-100 text-gray-800',
    processing: 'bg-yellow-100 text-yellow-800',
    needs_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

export default async function DocumentsPage() {
  const documents = await getDocuments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and review uploaded documents
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Upload Document
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-6">
            Upload your first document to get started with the knowledge base.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Upload Document
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {doc.title}
                        </h3>
                        {getStatusBadge(doc.status)}
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {doc.document_type}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                        <span>Uploaded by {doc.profiles?.email}</span>
                        <span>
                          {doc.approved_chunks}/{doc.total_chunks} chunks approved
                        </span>
                        <span>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {doc.status === 'needs_review' && (
                        <Link
                          href={`/review/${doc.id}`}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Review Chunks
                        </Link>
                      )}
                      <Link
                        href={`/documents/${doc.id}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
