'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

interface Wordbook {
  id: string
  title: string
  created_at: string
}

export default function WordbooksPage() {
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWordbooks()
  }, [])

  const fetchWordbooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ユーザーが見つかりません')

      const { data, error } = await supabase
        .from('wordbooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWordbooks(data || [])
    } catch (error) {
      console.error('Error fetching wordbooks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">単語帳一覧</h1>
          <Link
            href="/wordbooks/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            新しい単語帳を作成
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wordbooks.map((wordbook) => (
            <Link
              key={wordbook.id}
              href={`/wordbooks/${wordbook.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {wordbook.title}
                </h2>
                <p className="text-sm text-gray-500">
                  作成日: {new Date(wordbook.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {wordbooks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">単語帳がありません</p>
          </div>
        )}
      </div>
    </div>
  )
} 