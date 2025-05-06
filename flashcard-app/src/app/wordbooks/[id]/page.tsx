'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

interface Word {
  id: string
  front: string
  back: string
  created_at: string
}

interface Wordbook {
  id: string
  title: string
  created_at: string
}

export default function WordbookDetailPage({ params }: { params: { id: string } }) {
  const [wordbook, setWordbook] = useState<Wordbook | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchWordbook()
    fetchWords()
  }, [params.id])

  const fetchWordbook = async () => {
    try {
      const { data, error } = await supabase
        .from('wordbooks')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setWordbook(data)
    } catch (error) {
      console.error('Error fetching wordbook:', error)
      setError('単語帳の取得に失敗しました')
    }
  }

  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('wordbook_id', params.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setWords(data || [])
    } catch (error) {
      console.error('Error fetching words:', error)
      setError('単語の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm('この単語を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId)

      if (error) throw error
      fetchWords()
    } catch (error) {
      console.error('Error deleting word:', error)
      setError('単語の削除に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton backUrl="/dashboard" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {wordbook?.title}
            </h1>
            <p className="text-sm text-gray-500">
              作成日: {new Date(wordbook?.created_at || '').toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-4">
            <Link
              href={`/wordbooks/${params.id}/test`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              テスト開始
            </Link>
            <Link
              href={`/wordbooks/${params.id}/words/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              単語を追加
            </Link>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {words.map((word) => (
              <li key={word.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-medium text-gray-900 truncate">
                        {word.front}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{word.back}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleDeleteWord(word.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {words.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">単語が登録されていません</p>
              <Link
                href={`/wordbooks/${params.id}/words/new`}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                単語を追加
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 