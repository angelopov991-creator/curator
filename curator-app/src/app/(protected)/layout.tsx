import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getUser()

  if (!profile) {
    redirect('/login')
  }

  if (!profile.is_active) {
    redirect('/login?error=inactive')
  }

  // Check if user has at least curator role for most protected routes
  const isCuratorOrAdmin = profile.role === 'curator' || profile.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-xl font-bold text-blue-600">📚 KB Curator</span>
              </Link>

              {isCuratorOrAdmin && (
                <div className="ml-10 flex items-center space-x-4">
                  <Link
                    href="/dashboard"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/upload"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Upload
                  </Link>
                  <Link
                    href="/documents"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Documents
                  </Link>
                </div>
              )}

              {profile.role === 'admin' && (
                <div className="ml-4 flex items-center space-x-4 border-l border-gray-200 pl-4">
                  <Link
                    href="/admin"
                    className="text-purple-600 hover:text-purple-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Admin
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{profile.email}</span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    profile.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : profile.role === 'curator'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {profile.role}
                </span>
              </div>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isCuratorOrAdmin ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              You need curator or admin privileges to access these features.
            </p>
            <p className="text-sm text-gray-500">
              Contact an administrator to request curator access.
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
