import DocumentUploader from '@/components/curator/DocumentUploader'
import Link from 'next/link'

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload documents for processing and knowledge base integration
          </p>
        </div>
        <Link
          href="/documents"
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          View All Documents
        </Link>
      </div>

      <DocumentUploader />
    </div>
  )
}
