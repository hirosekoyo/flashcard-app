'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Wordbook {
  id: string
  title: string
  created_at: string
  card_count: number
}

export default function DashboardPage() {
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'wordbooks' | 'study'>('wordbooks')
  const [selectedWordbooks, setSelectedWordbooks] = useState<Record<string, boolean>>({})
  const [showSettings, setShowSettings] = useState(false)
  const [studySettings, setStudySettings] = useState({
    frontToBack: true,
    useSpacedRepetition: true
  })
  const router = useRouter()

  useEffect(() => {
    fetchWordbooks()
  }, [])

  const fetchWordbooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 単語帳の基本情報を取得
      const { data: wordbooksData, error: wordbooksError } = await supabase
        .from('wordbooks')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (wordbooksError) throw wordbooksError

      // 単語数を各単語帳ごとに取得
      const wordbooksWithCardCount = await Promise.all(
        (wordbooksData || []).map(async (wordbook) => {
          const { count, error: countError } = await supabase
            .from('words')
            .select('id', { count: 'exact', head: false })
            .eq('wordbook_id', wordbook.id)

          if (countError) {
            console.error('Error fetching word count:', countError)
            return {
              ...wordbook,
              card_count: 0
            }
          }

          return {
            ...wordbook,
            card_count: count || 0
          }
        })
      )

      setWordbooks(wordbooksWithCardCount || [])
    } catch (error) {
      console.error('Error fetching wordbooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleWordbook = (id: string) => {
    setSelectedWordbooks(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const startStudy = () => {
    const selectedIds = Object.entries(selectedWordbooks)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id)
    
    if (selectedIds.length === 0) return
    
    // 暗記テスト画面に遷移する処理
    // この部分は後ほど実装
    alert('暗記テストを開始します')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-indigo-600" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="#6366F1" fillOpacity="0.15"/>
                <path d="M24 36V12M24 12C20.6863 12 18 14.6863 18 18C18 21.3137 20.6863 24 24 24C27.3137 24 30 21.3137 30 18C30 14.6863 27.3137 12 24 12Z" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="ml-2 text-xl font-bold">忘却曲線単語帳</span>
            </div>
            <nav className="flex">
              <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-indigo-600">
                ダッシュボード
              </Link>
              <Link href="/wordbooks/new" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                単語帳作成
              </Link>
            </nav>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:text-gray-800 active:bg-gray-50 transition ease-in-out duration-150"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">マイ単語帳</h1>
        </div>

        {/* タブ */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('wordbooks')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'wordbooks'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="inline-flex items-center justify-center">
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  単語帳
                </span>
              </button>
              <button
                onClick={() => setActiveTab('study')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'study'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="inline-flex items-center justify-center">
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path>
                  </svg>
                  暗記
                </span>
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'wordbooks' && (
          <div>
            {/* 単語帳リスト */}
            <div className="grid grid-cols-1 gap-4">
              {wordbooks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">単語帳がありません</p>
                  <Link
                    href="/wordbooks/new"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    新しい単語帳を作成
                  </Link>
                </div>
              ) : (
                <>
                  {/* 新規単語帳作成ボタン */}
                  <Link
                    href="/wordbooks/new"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 bg-white"
                  >
                    <div className="flex flex-col items-center text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        新しい単語帳を作成
                      </span>
                      <span className="block text-sm text-gray-500">
                        作成する
                      </span>
                    </div>
                  </Link>

                  {/* 単語帳リスト */}
                  {wordbooks.map((wordbook) => (
                    <Link
                      key={wordbook.id}
                      href={`/wordbooks/${wordbook.id}`}
                      className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
                    >
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {wordbook.title}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {wordbook.card_count}枚のカード
                      </p>
                      <p className="text-sm text-gray-500">
                        作成日: {new Date(wordbook.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'study' && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">単語帳を選択</h2>
              <p className="text-sm text-gray-500">学習したい単語帳を選択してください</p>
            </div>

            {/* 単語帳選択リスト */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              {wordbooks.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500">単語帳がありません</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {wordbooks.map((wordbook) => (
                    <div key={wordbook.id} className="p-4 flex items-center">
                      <input
                        type="checkbox"
                        id={`wordbook-${wordbook.id}`}
                        checked={!!selectedWordbooks[wordbook.id]}
                        onChange={() => toggleWordbook(wordbook.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`wordbook-${wordbook.id}`} className="ml-3 block">
                        <span className="text-sm font-medium text-gray-900">{wordbook.title}</span>
                        <span className="text-sm text-gray-500 block">
                          {wordbook.card_count}枚のカード
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 学習設定 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">学習設定</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">表→裏表示</span>
                    <p className="text-sm text-gray-500">表面から裏面を当てる学習方法に切り替えます</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none">
                    <input
                      type="checkbox"
                      id="toggle-front-back"
                      checked={studySettings.frontToBack}
                      onChange={() => setStudySettings({...studySettings, frontToBack: !studySettings.frontToBack})}
                      className="opacity-0 absolute h-0 w-0"
                    />
                    <label
                      htmlFor="toggle-front-back"
                      className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                        studySettings.frontToBack ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                          studySettings.frontToBack ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">忘却曲線順</span>
                    <p className="text-sm text-gray-500">忘却曲線に沿った出題順にします</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none">
                    <input
                      type="checkbox"
                      id="toggle-spaced-repetition"
                      checked={studySettings.useSpacedRepetition}
                      onChange={() => setStudySettings({...studySettings, useSpacedRepetition: !studySettings.useSpacedRepetition})}
                      className="opacity-0 absolute h-0 w-0"
                    />
                    <label
                      htmlFor="toggle-spaced-repetition"
                      className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                        studySettings.useSpacedRepetition ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                          studySettings.useSpacedRepetition ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 学習開始ボタン */}
            <button
              onClick={startStudy}
              disabled={Object.values(selectedWordbooks).filter(Boolean).length === 0}
              className={`w-full py-3 px-4 text-white text-base font-medium rounded-md ${
                Object.values(selectedWordbooks).filter(Boolean).length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              学習を開始する
            </button>
          </div>
        )}
      </main>
    </div>
  )
} 