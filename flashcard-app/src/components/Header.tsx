'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface HeaderProps {
  showBackButton?: boolean
  backUrl?: string
}

export default function Header({ showBackButton = false, backUrl }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {showBackButton && (
              <button
                onClick={() => backUrl ? router.push(backUrl) : router.back()}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← 戻る
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
} 