'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

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

  // wordbooksが取得された後にselectedWordbooksを初期化する
  useEffect(() => {
    if (wordbooks.length > 0) {
      const initialSelected = wordbooks.reduce((acc, wordbook) => {
        acc[wordbook.id] = true; // すべての単語帳を初期値でチェック済みにする
        return acc;
      }, {} as Record<string, boolean>);
      setSelectedWordbooks(initialSelected);
    }
  }, [wordbooks]); // wordbooksが変更されたときに実行

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
      .map(([id]) => id);

    // 選択された単語帳が0個の場合は学習を開始しない
    if (selectedIds.length === 0) {
        alert('学習する単語帳を1つ以上選択してください。');
        return;
    }

    // クエリパラメータを作成
    const queryParams = new URLSearchParams();
    queryParams.append('ids', selectedIds.join(',')); // 選択されたIDをカンマ区切りで結合
    queryParams.append('frontToBack', String(studySettings.frontToBack));
    queryParams.append('useSpacedRepetition', String(studySettings.useSpacedRepetition));


    router.push(`/wordbooks/${selectedIds[0]}/test?${queryParams.toString()}`);
  };

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
                <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="#6366F1" fillOpacity="0.15" />
                <path d="M24 36V12M24 12C20.6863 12 18 14.6863 18 18C18 21.3137 20.6863 24 24 24C27.3137 24 30 21.3137 30 18C30 14.6863 27.3137 12 24 12Z" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="ml-2 text-xl font-bold">忘却曲線単語帳</span>
            </div>
            <Button variant="outline" onClick={handleLogout}>ログアウト</Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">マイ単語帳</h1>
        </div>

        {/* タブ */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <Button variant={activeTab === 'wordbooks' ? 'default' : 'ghost'} className="w-1/2 rounded-none border-b-2" onClick={() => setActiveTab('wordbooks')}>単語帳</Button>
              <Button variant={activeTab === 'study' ? 'default' : 'ghost'} className="w-1/2 rounded-none border-b-2" onClick={() => setActiveTab('study')}>テスト</Button>
            </nav>
          </div>
        </div>

        {activeTab === 'wordbooks' && (
          <div>
            {/* 単語帳リスト */}
            <div className="grid grid-cols-1 gap-4">
              {wordbooks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500 mb-4">単語帳がありません</p>
                    <Link href="/wordbooks/new">
                      <Button>新しい単語帳を作成</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* 新規単語帳作成ボタン */}
                  <Link href="/wordbooks/new">
                    <Card className="hover:border-gray-400 cursor-pointer border-dashed border-2">
                      <CardContent className="flex flex-col items-center text-center py-6">
                        <svg className="mx-auto h-[1em] w-[1em] inline align-middle text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        <span className="mt-2 block text-sm font-medium text-gray-900">新しい単語帳を作成</span>
                        <span className="block text-sm text-gray-500">作成する</span>
                      </CardContent>
                    </Card>
                  </Link>
                  {/* 単語帳リスト */}
                  {wordbooks.map((wordbook) => (
                    <Link key={wordbook.id} href={`/wordbooks/${wordbook.id}`}>
                      <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer">
                        <CardHeader>
                          <CardTitle className="text-xl">{wordbook.title}</CardTitle>
                          <CardDescription>{wordbook.card_count}枚のカード</CardDescription>
                          <CardDescription>作成日: {new Date(wordbook.created_at).toLocaleDateString()}</CardDescription>
                        </CardHeader>
                      </Card>
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
            <Card className="mb-6">
              <CardContent>
                {wordbooks.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-gray-500">単語帳がありません</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {wordbooks.map((wordbook) => (
                      <div key={wordbook.id} className="p-4">
                        <label htmlFor={`wordbook-${wordbook.id}`} className="flex items-center cursor-pointer w-full">
                          <input
                            type="checkbox"
                            id={`wordbook-${wordbook.id}`}
                            checked={!!selectedWordbooks[wordbook.id]} // ここが重要：selectedWordbooksの状態と同期させる
                            onChange={() => toggleWordbook(wordbook.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 block">
                            <span className="text-sm font-medium text-gray-900">{wordbook.title}</span>
                            <span className="text-sm text-gray-500 block">
                              {wordbook.card_count}枚のカード
                            </span>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 学習設定 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">学習設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">カードを裏返す</span>
                    <p className="text-sm text-gray-500">裏⇒表の順番で表示します</p>
                  </div>
                  <Switch checked={studySettings.frontToBack} onCheckedChange={() => setStudySettings({ ...studySettings, frontToBack: !studySettings.frontToBack })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">グングンモード</span>
                    <p className="text-sm text-gray-500">忘却曲線に沿って出題する、効率よく記憶に定着させるモードです</p>
                  </div>
                  <Switch checked={studySettings.useSpacedRepetition} onCheckedChange={() => setStudySettings({ ...studySettings, useSpacedRepetition: !studySettings.useSpacedRepetition })} />
                </div>
              </CardContent>
            </Card>

            {/* 学習開始ボタン */}
            <Button
              onClick={startStudy}
              disabled={Object.values(selectedWordbooks).filter(Boolean).length === 0} // 単語帳が1つも選択されていない場合に無効
              className="w-full text-base"
            >
              学習を開始する
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}