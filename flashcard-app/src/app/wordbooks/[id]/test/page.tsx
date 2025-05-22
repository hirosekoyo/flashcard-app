'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Word {
  word_id: string; // word_id を ID として使用
  level: number;
  mistake_count: number;
  next_review_at: string | null; // ISO 8601形式の文字列と仮定 (時刻情報も含む可能性) または null
  wordbook_id: string;
  // Supabase の結合結果を考慮し、words は単一オブジェクトとしてネストされると想定
  words: { 
    front: string;
    back: string;
  };
}

interface StudySettings {
  frontToBack: boolean
  useSpacedRepetition: boolean
}

export default function TestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFlipped, setIsFlipped] = useState(false)
  // word.word_id をキーとして使用
  const [progresses, setProgresses] = useState<Record<string, number>>({}) 
  const [mistake, setMistake] = useState<Record<string, number>>({})
  const [studySettings, setStudySettings] = useState<StudySettings>({
    frontToBack: true,
    useSpacedRepetition: true,
  })
  const [wordbookIds, setWordbookIds] = useState<string[]>([])


  useEffect(() => {
    const idsQuery = searchParams.get('ids')
    const frontToBackQuery = searchParams.get('frontToBack')
    const useSpacedRepetitionQuery = searchParams.get('useSpacedRepetition')

    if (idsQuery) {
      setWordbookIds(idsQuery.split(','))
    }

    setStudySettings({
      frontToBack: frontToBackQuery === 'true',
      useSpacedRepetition: useSpacedRepetitionQuery === 'true',
    })
  }, [searchParams])

  // Helper function to get start of today in ISO string
  const getStartOfTodayISO = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻を00:00:00.000に設定
    return today.toISOString();
  }

// fetchTestData 関数内
const fetchTestData = async (wordbookIds: string[]) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setWords([]);
      setLoading(false);
      return; 
    }
    
    let query = supabase
      .from('learning_progress')
      .select(`
        word_id,
        level,
        mistake_count,
        next_review_at,
        wordbook_id,
        words!inner(front, back)
      `)
      .in('wordbook_id', wordbookIds); 

    // スペース反復が有効な場合のみ、追加のフィルタとソートを適用
    if (studySettings.useSpacedRepetition) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      query = query
        .or(`next_review_at.lte.${startOfToday.toISOString()},next_review_at.is.null`)
        .order('next_review_at', { ascending: true }) 
        .order('mistake_count', { ascending: false }); 
    }
    // studySettings.useSpacedRepetition が false の場合、ここでは order やその他の条件を追加しない

    const { data, error } = await query; // 構築されたクエリを実行

    if (error) {
      console.error('Error fetching test data:', error);
      setWords([]);
      setLoading(false);
      return;
    }

    if (!data) {
      setWords([]);
      setLoading(false);
      return;
    }

    let transformedWords: Word[] = data.map((item: any) => {
      const wordsData = item.words; 
      return {
        word_id: item.word_id,
        level: item.level,
        mistake_count: item.mistake_count,
        next_review_at: item.next_review_at,
        wordbook_id: item.wordbook_id,
        words: { 
          front: wordsData?.front || '', 
          back: wordsData?.back || ''    
        }
      };
    });
    
    // スペース反復がオフの場合、クライアント側でシャッフル
    if (!studySettings.useSpacedRepetition) {
      transformedWords = transformedWords.sort(() => Math.random() - 0.5);
    }

    setWords(transformedWords); 
    setLoading(false);
    
  } catch (error) {
    console.error('Catch Error fetching test data:', error);
    setWords([]);
    setLoading(false);
  }
};

  useEffect(() => {
    const loadData = async () => {
      if (wordbookIds.length === 0) {
        setLoading(false);
        setWords([]);
        return;
      }
      setLoading(true); // ロード開始
      await fetchTestData(wordbookIds); 
      // fetchTestData内でsetLoading(false)を呼ぶので、ここでの追加のsetLoading(false)は不要
    };
    
    // wordbookIds が変更された場合にのみ実行（初回ロード時も含む）
    if (wordbookIds.length > 0) {
        loadData();
    } else {
        setLoading(false); // IDsがない場合はローディングを終了
    }
  }, [wordbookIds, studySettings.useSpacedRepetition]);

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
    today.setHours(0, 0, 0, 0); // 時刻を00:00:00.000に設定
    return today.toISOString()
  }

  const handleRemember = async () => {
    if (words.length === 0) return;
    const word = words[currentIndex]
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // progresses と mistake のキーを word.word_id に変更
    const currentLevel = progresses[word.word_id] ?? 0 
    const newLevel = Math.min(currentLevel + 1, 10)
    const nextReview = getNextReviewDate(newLevel)
    
    const targetWordbookId = word.wordbook_id; 

    const { error } = await supabase
      .from('learning_progress')
      .upsert({ user_id: user.id, wordbook_id: targetWordbookId, word_id: word.word_id, level: newLevel, next_review_at: nextReview, mistake_count: mistake[word.word_id] ?? 0 }, { onConflict: 'user_id,word_id,wordbook_id' })
    if (error) {
      console.error('upsert error (handleRemember):', error)
      console.error('Error details:', error.details); 
      console.error('Error message:', error.message);
    }
    setProgresses((prev) => ({ ...prev, [word.word_id]: newLevel })) // キーを word.word_id に
    
    goNext()
  }

  const handleForget = async () => {
    if (words.length === 0) return;
    const word = words[currentIndex]
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // progresses と mistake のキーを word.word_id に変更
    const currentMistake = mistake[word.word_id] ?? 0 
    const newMistake = Math.min(currentMistake + 1, 999)
    
    const targetWordbookId = word.wordbook_id; 

    const { error } = await supabase
      .from('learning_progress')
      .upsert({ user_id: user.id, wordbook_id: targetWordbookId, word_id: word.word_id, level: 0, next_review_at: null, mistake_count: newMistake }, { onConflict: 'user_id,word_id,wordbook_id' }) 
    if (error) {
      console.error('upsert error (handleForget):', error)
      console.error('Error details:', error.details); 
      console.error('Error message:', error.message);
    }
    setProgresses((prev) => ({ ...prev, [word.word_id]: 0 })) // キーを word.word_id に
    setMistake((prev) => ({ ...prev, [word.word_id]: newMistake })) // キーを word.word_id に

    goNext()
  }

  const goNext = () => {
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < words.length) {
        setIsFlipped(false);
        return nextIndex;
      } else {
        router.push(`/dashboard`);
        return prevIndex;
      }
    });
  };

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
          <p className="text-lg text-gray-500">今日のノルマもまだ覚えていない単語もありません</p>
          <p className="text-lg text-gray-500">それでも学習したいあなたは、グングンモードをOFFにしてテストしてください</p>
          <p className="text-lg text-gray-500">たまには休んでもいいんですよ。</p>
          <button
            onClick={() => router.push(`/dashboard`)}
            className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  const currentWord = words[currentIndex]
  const frontContent = studySettings.frontToBack ? currentWord.words.front : currentWord.words.back;
  const backContent = studySettings.frontToBack ? currentWord.words.back : currentWord.words.front;

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
            // key を word_id に変更
            key={currentWord.word_id} 
            className={`relative w-80 h-48 cursor-pointer perspective`}
            onClick={() => setIsFlipped(f => !f)}
          >
            <div className={`absolute w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? 'rotate-y-180' : ''}`}>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center text-2xl font-bold">
                <CardContent className="flex items-center justify-center h-full text-2xl font-bold p-4 text-center">
                  {frontContent}
                </CardContent>
              </Card>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center text-2xl font-bold rotate-y-180">
                <CardContent className="flex items-center justify-center h-full text-2xl font-bold p-4 text-center">
                  {backContent}
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