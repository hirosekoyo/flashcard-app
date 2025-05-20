'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Word {
  id: string
  front: string
  back: string
}

export default function TestPage() {
  const params = useParams<{ id: string }>();
  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFlipped, setIsFlipped] = useState(false)
  const [progresses, setProgresses] = useState<Record<string, number>>({})
  const router = useRouter()

  // fetchWords 関数
  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('wordbook_id', params.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setWords(data || [])
      return data || [] // 取得したwordsを返す
    } catch (error) {
      console.error('Error fetching words:', error)
      return [] // エラー時は空配列を返す
    } finally {
      // setLoading(false) は全てのフェッチが完了した後に調整
    }
  }

  // fetchProgress 関数 (wordsデータを引数として受け取るように変更)
  const fetchProgress = async (fetchedWords: Word[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const wordIds = fetchedWords.map(w => w.id)
      if (wordIds.length === 0) {
        console.log("No words to fetch progress for.");
        setProgresses({}); // 単語がない場合は進捗を空にする
        return;
      }

      const { data, error } = await supabase
        .from('learning_progress')
        .select('word_id, level')
        .eq('user_id', user.id)
        .in('word_id', wordIds) // ここでfetchWordsから渡された単語IDを使用
      if (error) throw error

      const map: Record<string, number> = {}
      data?.forEach((row: any) => { map[row.word_id] = row.level })

      setProgresses(map)
    } catch (e) {
      console.error('Error fetching progress:', e); // エラーハンドリングを改善
    } finally {
      setLoading(false) // 全てのフェッチが完了したらローディングを解除
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true); // フェッチ開始時にローディングを設定
      // 最初に単語を取得し、その結果をプログレスのフェッチに渡す
      const fetchedWordsData = await fetchWords();
      // fetchWordsが単語を返した場合のみfetchProgressを実行
      if (fetchedWordsData.length > 0) {
        await fetchProgress(fetchedWordsData);
      } else {
        // 単語がない場合はローディングを解除
        setLoading(false);
      }
    };

    // params.id が変更されたときにデータを再ロード
    if (params.id) {
      loadData();
    }
  }, [params.id]); // params.id が変更されたときに再実行

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
    const word = words[currentIndex]
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const currentLevel = progresses[word.id] ?? 0
    const newLevel = Math.min(currentLevel + 1, 10)
    const nextReview = getNextReviewDate(newLevel)
    const { error } = await supabase
      .from('learning_progress')
      .upsert({ user_id: user.id, word_id: word.id, level: newLevel, next_review_at: nextReview }, { onConflict: 'user_id,word_id' }) // onConflict を追加
    if (error) {
      console.error('upsert error (handleRemember):', error)
    }
    setProgresses((prev) => ({ ...prev, [word.id]: newLevel }))
    goNext()
  }

  const handleForget = async () => {
    const word = words[currentIndex]
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const nextReview = getNextReviewDate(0)
    const { error } = await supabase
      .from('learning_progress')
      .upsert({ user_id: user.id, word_id: word.id, level: 0, next_review_at: nextReview }, { onConflict: 'user_id,word_id' }) // onConflict を追加
    if (error) {
      console.error('upsert error (handleForget):', error)
    }
    setProgresses((prev) => ({ ...prev, [word.id]: 0 })) // 忘れた場合はレベルを0に設定
    goNext()
  }

  const goNext = () => {
    setIsFlipped(false)
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      router.push(`/wordbooks/${params.id}`)
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
        <div className="flex justify-center mb-8">
          <div
            className={`relative w-80 h-48 cursor-pointer perspective`}
            onClick={() => setIsFlipped(f => !f)}
          >
            <div className={`absolute w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? 'rotate-y-180' : ''}`}>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center text-2xl font-bold">
                <CardContent className="flex items-center justify-center h-full text-2xl font-bold">
                  {currentWord.front}
                </CardContent>
              </Card>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center text-2xl font-bold rotate-y-180">
                <CardContent className="flex items-center justify-center h-full text-2xl font-bold">
                  {currentWord.back}
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