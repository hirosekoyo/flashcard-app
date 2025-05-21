'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation' // useParams を useSearchParams に変更
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Word {
  id: string
  front: string
  back: string
  wordbook_id: string // どの単語帳に属するかを保持するため追加
}

interface StudySettings { // 学習設定用のインターフェース
  frontToBack: boolean
  useSpacedRepetition: boolean
}

export default function TestPage() {
  const router = useRouter()
  const searchParams = useSearchParams() // クエリパラメータを取得

  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFlipped, setIsFlipped] = useState(false)
  const [progresses, setProgresses] = useState<Record<string, number>>({})
  const [mistake, setMistake] = useState<Record<string, number>>({}) // タイポを修正: setMisitake -> setMistake
  const [studySettings, setStudySettings] = useState<StudySettings>({ // 学習設定のstate
    frontToBack: true,
    useSpacedRepetition: false,
  })
  const [wordbookIds, setWordbookIds] = useState<string[]>([]) // 学習対象の単語帳IDリスト

  // クエリパラメータから学習設定と単語帳IDを読み込むEffect
  useEffect(() => {
    const idsQuery = searchParams.get('ids')
    const frontToBackQuery = searchParams.get('frontToBack')
    const useSpacedRepetitionQuery = searchParams.get('useSpacedRepetition')

    if (idsQuery) {
      setWordbookIds(idsQuery.split(','))
    }

    setStudySettings({
      frontToBack: frontToBackQuery === 'true', // 文字列からbooleanに変換
      useSpacedRepetition: useSpacedRepetitionQuery === 'true', // 文字列からbooleanに変換
    })
  }, [searchParams])


  // fetchWords 関数 (複数のwordbook_idに対応)
  const fetchWords = async (ids: string[]) => {
    if (ids.length === 0) {
      setWords([])
      return []
    }
    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .in('wordbook_id', ids) // 複数のIDで検索
        .order('created_at', { ascending: true }) // 必要に応じて並び替え順を検討

      if (error) throw error
      
      // 取得した単語をシャッフルする (オプション)
      const shuffledWords = data ? [...data].sort(() => Math.random() - 0.5) : []
      setWords(shuffledWords)
      return shuffledWords

    } catch (error) {
      console.error('Error fetching words:', error)
      setWords([]) // エラー時は空配列を設定
      return []
    }
  }


  const fetchProgress = async (fetchedWords: Word[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const wordIds = fetchedWords.map(w => w.id)
      if (wordIds.length === 0) {
        setProgresses({})
        setMistake({})
        return
      }

      const { data, error } = await supabase
        .from('learning_progress')
        .select('word_id, level, mistake_count')
        .eq('user_id', user.id)
        .in('word_id', wordIds)
      if (error) throw error

      const Pmap: Record<string, number> = {}
      data?.forEach((row: any) => { Pmap[row.word_id] = row.level })
      setProgresses(Pmap)

      const Mmap: Record<string, number> = {}
      data?.forEach((row: any) => { Mmap[row.word_id] = row.mistake_count })
      setMistake(Mmap)

    } catch (e) {
      console.error('Error fetching progress:', e)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (wordbookIds.length === 0) {
        setLoading(false)
        setWords([]) // IDがない場合は単語も空にする
        return
      }
      setLoading(true)
      const fetchedWordsData = await fetchWords(wordbookIds)
      if (fetchedWordsData.length > 0) {
        await fetchProgress(fetchedWordsData)
      }
      setLoading(false)
    }

    loadData()
  }, [wordbookIds]) // wordbookIds が変更されたときに再実行

  const getNextReviewDate = (level: number) => {
    const today = new Date()
    let days = 1
    switch (level) {
      case 0: days = 1; break
      case 1: days = 2; break
      case 2: days = 3; break
      case 3: days = 5; break
      case 4: days = 7; break
      case 5: days = 14; break
      case 6: days = 30; break
      case 7: days = 90; break
      case 8: days = 180; break
      case 9: days = 180; break
      case 10: days = 180; break
      default: days = 1
    }
    today.setDate(today.getDate() + days)
    return today.toISOString().split('T')[0]
  }

  const handleRemember = async () => {
    if (words.length === 0) return; // 単語がない場合は何もしない
    const word = words[currentIndex]
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const currentLevel = progresses[word.id] ?? 0
    const newLevel = Math.min(currentLevel + 1, 10)
    const nextReview = getNextReviewDate(newLevel)
    const { error } = await supabase
      .from('learning_progress')
      .upsert({ user_id: user.id, word_id: word.id, level: newLevel, next_review_at: nextReview, mistake_count: mistake[word.id] ?? 0 }, { onConflict: 'user_id,word_id' })
    if (error) {
      console.error('upsert error (handleRemember):', error)
    }
    setProgresses((prev) => ({ ...prev, [word.id]: newLevel }))
    goNext()
  }

  const handleForget = async () => {
    if (words.length === 0) return; // 単語がない場合は何もしない
    const word = words[currentIndex]
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const currentMistake = mistake[word.id] ?? 0
    const newMistake = Math.min(currentMistake + 1, 999)
    const { error } = await supabase
      .from('learning_progress')
      .upsert({ user_id: user.id, word_id: word.id, level: 0, next_review_at: '2100-01-01', mistake_count: newMistake }, { onConflict: 'user_id,word_id' })
    if (error) {
      console.error('upsert error (handleForget):', error)
    }
    setProgresses((prev) => ({ ...prev, [word.id]: 0 }))
    setMistake((prev) => ({ ...prev, [word.id]: newMistake }))
    goNext()
  }

  const goNext = () => {
    setIsFlipped(false)
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // 複数の単語帳を学習した場合、特定の単語帳に戻るのではなくダッシュボードが良いでしょう
      router.push(`/dashboard`)
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
            onClick={() => router.push(`/dashboard`)} // 戻り先をダッシュボードに
            className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  const currentWord = words[currentIndex]
  // studySettings.frontToBack に応じて表示する面を決定
  const frontContent = studySettings.frontToBack ? currentWord.front : currentWord.back;
  const backContent = studySettings.frontToBack ? currentWord.back : currentWord.front;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500">
            {currentIndex + 1} / {words.length}
          </p>
        </div>
        <div className="flex justify-center mb-8">
          <div
            className={`relative w-80 h-48 cursor-pointer perspective`}
            onClick={() => setIsFlipped(f => !f)}
          >
            <div className={`absolute w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? 'rotate-y-180' : ''}`}>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center text-2xl font-bold">
                <CardContent className="flex items-center justify-center h-full text-2xl font-bold p-4 text-center"> {/* p-4 text-center を追加 */}
                  {frontContent} {/* 学習設定に応じて表示 */}
                </CardContent>
              </Card>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center text-2xl font-bold rotate-y-180">
                <CardContent className="flex items-center justify-center h-full text-2xl font-bold p-4 text-center"> {/* p-4 text-center を追加 */}
                  {backContent} {/* 学習設定に応じて表示 */}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-8">
          <Button variant="destructive" size="lg" onClick={handleForget}>忘れた</Button>
          <Button variant="default" size="lg" onClick={handleRemember}>覚えた</Button>
        </div>
      </div>
      <style jsx>{`
        .perspective {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}