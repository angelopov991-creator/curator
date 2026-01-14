import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AIProviderSettings from '@/components/admin/AIProviderSettings'

interface User {
  id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

async function getUsers(): Promise<User[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data || []
}

async function getSystemStats() {
  const supabase = await createClient()

  const [documentsResult, chunksResult, vectorsResult] = await Promise.all([
    supabase.from('documents').select('id, status'),
    supabase.from('document_chunks').select('id, status'),
    supabase.from('kb_vectors').select('id'),
  ])

  const stats = {
    totalDocuments: documentsResult.data?.length || 0,
    totalChunks: chunksResult.data?.length || 0,
    totalVectors: vectorsResult.data?.length || 0,
    documentsByStatus: documentsResult.data?.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {},
    chunksByStatus: chunksResult.data?.reduce((acc, chunk) => {
      acc[chunk.status] = (acc[chunk.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {},
  }

  return stats
}

function getRoleBadge(role: string) {
  const styles = {
    admin: 'bg-purple-100 text-purple-800',
    curator: 'bg-blue-100 text-blue-800',
    user: 'bg-gray-100 text-gray-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {role}
    </span>
  )
}

export default async function AdminPage() {
  const [users, stats] = await Promise.all([getUsers(), getSystemStats()])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* AI Provider Settings */}
      <AIProviderSettings />

      {/* System Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📄</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Documents
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalDocuments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🔗</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Chunks
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalChunks}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🧮</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Vector Embeddings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalVectors}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">👥</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Status Breakdown */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Status</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {Object.entries(stats.documentsByStatus).map(([status, count]) => (
              <li key={status} className="px-6 py-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {status.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">{count} documents</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* User Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          <Link
            href="/admin/users/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Add User
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li key={user.id}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getRoleBadge(user.role)}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
