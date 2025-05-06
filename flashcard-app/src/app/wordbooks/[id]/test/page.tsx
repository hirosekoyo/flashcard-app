'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Word {
  id: string
  front: string
  back: string
}

export default function TestPage({ params }: { params: { id: string } }) {
  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchWords()
  }, [params.id])

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
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async (status: '未学習' | '学習中' | '習得済み') => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowAnswer(false)
    } else {
      router.push(`/wordbooks/${params.id}`)
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ユーザーが見つかりません')

      const { error } = await supabase
        .from('learning_progress')
        .upsert({
          user_id: user.id,
          word_id: words[currentIndex].id,
          status,
          next_review_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-500">単語が登録されていません</p>
          <button
            onClick={() => router.push(`/wordbooks/${params.id}`)}
            className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            単語帳に戻る
          </button>
        </div>
      </div>
    )
  }

  const currentWord = words[currentIndex]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500">
            {currentIndex + 1} / {words.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">{currentWord.front}</h2>
            {showAnswer && (
              <p className="text-xl text-gray-700 mb-8">{currentWord.back}</p>
            )}
          </div>

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              答えを見る
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleNext('未学習')}
                className="py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                未学習
              </button>
              <button
                onClick={() => handleNext('学習中')}
                className="py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                学習中
              </button>
              <button
                onClick={() => handleNext('習得済み')}
                className="py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                習得済み
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 