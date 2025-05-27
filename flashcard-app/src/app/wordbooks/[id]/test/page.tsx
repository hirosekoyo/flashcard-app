'use client'

import { useEffect, useState, startTransition } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Word {
  word_id: string;
  level: number;
  mistake_count: number;
  next_review_at: string | null;
  wordbook_id: string;
  words: {  
    front: string;
    back: string;
  };
}

interface StudySettings {
  frontToBack: boolean
  useSpacedRepetition: boolean
}

interface ProgressUpdate {
  word_id: string;
  wordbook_id: string;
  level: number;
  mistake_count: number;
  next_review_at: string | null;
}

export default function TestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFlipped, setIsFlipped] = useState(false)
  const [progresses, setProgresses] = useState<Record<string, number>>({})  
  const [mistake, setMistake] = useState<Record<string, number>>({})
  const [studySettings, setStudySettings] = useState<StudySettings>({
    frontToBack: true,
    useSpacedRepetition: true,
  })
  const [wordbookIds, setWordbookIds] = useState<string[]>([])
  const [todayReviewWordsCount, setTodayReviewWordsCount] = useState(0);
  
  // 未保存の変更を保持するステート
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, ProgressUpdate>>({});

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

  const getFormattedDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayDateString = (): string => {
    const today = new Date();
    return getFormattedDate(today);
  };

  const fetchTestData = async (wordbookIdsParam: string[]) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        startTransition(() => router.push('/login'));
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
        .in('wordbook_id', wordbookIdsParam);  

      if (studySettings.useSpacedRepetition) {
        const todayDateString = getTodayDateString();
        
        query = query
          .or(`next_review_at.lte.${todayDateString},next_review_at.is.null`)
          .order('next_review_at', { ascending: true })  
          .order('mistake_count', { ascending: false });  
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching test data:', error);
        setWords([]);
      } else if (data) {
        let transformedWords: Word[] = data.map((item: any) => ({
          word_id: item.word_id,
          level: item.level,
          mistake_count: item.mistake_count,
          next_review_at: item.next_review_at,
          wordbook_id: item.wordbook_id,
          words: {  
            front: item.words?.front || '',  
            back: item.words?.back || ''    
          }
        }));
        
        if (!studySettings.useSpacedRepetition) {
          transformedWords = transformedWords.sort(() => Math.random() - 0.5);
        } else {
          const todayStr = getTodayDateString();
          const count = transformedWords.filter(word => 
            word.next_review_at !== null && word.next_review_at <= todayStr
          ).length;
          setTodayReviewWordsCount(count);
        }
        setWords(transformedWords);  
      } else {
        setWords([]);
      }
    } catch (error) {
      console.error('Catch Error fetching test data:', error);
      setWords([]);
    } finally {
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
      await fetchTestData(wordbookIds);
    };
    
    if (wordbookIds.length > 0) {
        loadData();
    } else {
        setWords([]); // wordbookIdsが空になったら単語リストもクリア
        setLoading(false);
    }
  // studySettings.useSpacedRepetitionの変更時にもデータを再取得
  }, [wordbookIds, studySettings.useSpacedRepetition]); 

  const getNextReviewDate = (level: number): string => {
    const date = new Date();
    let days = 1;
    switch (level) {
      case 0: days = 1; break; // 間違えた場合も翌日レビューなど、仕様に応じて調整
      case 1: days = 2; break;
      case 2: days = 3; break;
      case 3: days = 5; break;
      case 4: days = 7; break;
      case 5: days = 14; break;
      case 6: days = 30; break;
      case 7: days = 90; break;
      case 8: days = 180; break;
      case 9: days = 180; break; // レベル9, 10は最大間隔
      case 10: days = 180; break;
      default: days = 1;
    }
    date.setDate(date.getDate() + days);
    return getFormattedDate(date); 
  };

  const handleRemember = () => {
    if (words.length === 0) return;
    const word = words[currentIndex];

    const currentProgressLevel = progresses[word.word_id] ?? word.level;
    const newLevel = Math.min(currentProgressLevel + 1, 10);
    const nextReview = getNextReviewDate(newLevel);

    setProgresses((prev) => ({ ...prev, [word.word_id]: newLevel }));
    // セッション中の間違いカウントをリセット
    setMistake(prev => {
      const updatedMistakes = { ...prev };
      delete updatedMistakes[word.word_id]; // または updatedMistakes[word.word_id] = 0;
      return updatedMistakes;
    });

    if (studySettings.useSpacedRepetition) {
      setUnsavedChanges(prev => ({
        ...prev,
        [word.word_id]: {
          word_id: word.word_id,
          wordbook_id: word.wordbook_id,
          level: newLevel,
          next_review_at: nextReview,
          mistake_count: 0, // 「覚えた」ので間違いカウントは0
        }
      }));
    }
    // useSpacedRepetition が false の場合はDB操作なし (ボタンが表示されない前提)
    
    goNext();
  };

  const handleForget = () => {
    if (words.length === 0) return;
    const word = words[currentIndex];
    
    const currentSessionMistake = mistake[word.word_id] ?? 0;
    const newSessionMistake = Math.min(currentSessionMistake + 1, 999);
    
    setProgresses((prev) => ({ ...prev, [word.word_id]: 0 })); // レベルを0に
    setMistake((prev) => ({ ...prev, [word.word_id]: newSessionMistake }));

    if (studySettings.useSpacedRepetition) {
      setUnsavedChanges(prev => ({
        ...prev,
        [word.word_id]: {
          word_id: word.word_id,
          wordbook_id: word.wordbook_id,
          level: 0, // 間違えたのでレベルは0
          next_review_at: null, // 次回レビュー日をリセット (または翌日などに設定)
          mistake_count: newSessionMistake, // セッション中の間違い回数を記録
        }
      }));
    }
    // useSpacedRepetition が false の場合はDB操作なし (ボタンが表示されない前提)

    goNext();
  };

  const handleSaveAndExit = async () => {
    if (Object.keys(unsavedChanges).length === 0) {
      startTransition(() => router.push('/dashboard'));
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      startTransition(() => router.push('/login'));
      return;
    }

    const updatesToPush = Object.values(unsavedChanges).map(change => ({
      user_id: user.id,
      wordbook_id: change.wordbook_id,
      word_id: change.word_id,
      level: change.level,
      next_review_at: change.next_review_at,
      mistake_count: change.mistake_count,
    }));

    const { error } = await supabase
      .from('learning_progress')
      .upsert(updatesToPush, { onConflict: 'user_id,word_id,wordbook_id' });

    if (error) {
      console.error('Error batch upserting learning progress:', error);
      alert('進捗の保存中にエラーが発生しました。'); // 必要に応じてより良いエラー通知を
    } else {
      setUnsavedChanges({}); // 保存成功したらクリア
    }
    startTransition(() => router.push('/dashboard'));
  };

  const goNext = () => {
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < words.length) {
        setIsFlipped(false);
        return nextIndex;
      } else {
        // studySettings.useSpacedRepetition が false の時だけ、最後のカード後にダッシュボードへ
        if (!studySettings.useSpacedRepetition) {
          startTransition(() => {
            router.push(`/dashboard`);
          });
        }
        // true の場合は最後のカードに留まり、「保存して終了」を待つ
        return prevIndex; // インデックスを現在のまま（最後のカード）に維持
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
          <p className="text-lg text-gray-500">出題されるカードはありません</p>
          {studySettings.useSpacedRepetition && ( // グングンモードがONの時だけOFFにする選択肢を表示
            <p className="text-lg text-gray-500">グングンモードをOFFにしてランダムに暗記しますか？</p>
          )}
          <Button
            onClick={() => {
              startTransition(() => router.push(`/dashboard`));
            }}
            className="mt-4 px-4 py-2"
            variant="outline"
          >
            ダッシュボードに戻る
          </Button>
          {studySettings.useSpacedRepetition && (
            <Button
              onClick={() => { 
                 setStudySettings(prevSettings => ({
                   ...prevSettings,
                   useSpacedRepetition: false,
                 }));
                 // setUnsavedChanges({}); // モード切替時に未保存の変更をクリアするかは要件次第
               }}
              className="mt-4 ml-2 px-4 py-2"
            >
              OFFにして暗記する
            </Button>
          )}
        </div>
      </div>
    )
  }

  const currentWord = words[currentIndex];
  // currentWord が undefined になるケースを考慮 (wordsが空になった直後など)
  if (!currentWord) {
     return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">エラーが発生しました。ダッシュボードに戻ってください。</div>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">ダッシュボードへ</Button>
      </div>
     )
  }
  const frontContent = studySettings.frontToBack ? currentWord.words.front : currentWord.words.back;
  const backContent = studySettings.frontToBack ? currentWord.words.back : currentWord.words.front;

  const isLastCard = currentIndex === words.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500">
            {studySettings.useSpacedRepetition && todayReviewWordsCount > 0 ? (
              <>
                {currentIndex + 1 > todayReviewWordsCount && todayReviewWordsCount > 0 ? (
                  <span className="text-lg font-bold text-green-600">ノルマ達成！</span>
                ) : (
                  <>
                    今日のノルマは<span className="text-3xl font-bold text-blue-600">{todayReviewWordsCount}</span>枚です！
                    <br />
                    学習レベル<span className="text-3xl font-bold text-blue-600">{progresses[currentWord.word_id] ?? currentWord.level}</span>
                  </>
                )}
                <br />
                {currentIndex + 1} / {words.length}
              </>
            ) : (
              <>{currentIndex + 1} / {words.length}</>
            )}
          </p>
        </div>
        <div className="flex justify-center mb-8">
          <div
            key={currentWord.word_id}  
            className={`relative w-80 h-48 cursor-pointer perspective`}
            onClick={() => setIsFlipped(f => !f)}
          >
            <div className={`absolute w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? 'rotate-y-180' : ''}`}>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center">
                <CardContent className="flex items-center justify-center h-full text-2xl font-bold p-4 text-center">
                  {frontContent}
                </CardContent>
              </Card>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center rotate-y-180">
                <CardContent className="flex items-center justify-center h-full text-2xl font-bold p-4 text-center">
                  {backContent}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* 操作ボタンエリア */}
        {studySettings.useSpacedRepetition ? (
          // グングンモード（Spaced Repetition）がONの場合
          <div className="flex justify-center gap-8">
            <Button variant="destructive" size="lg" onClick={handleForget} disabled={isFlipped && isLastCard && Object.keys(unsavedChanges).length > 0}>覚えてない</Button>
            <Button variant="default" size="lg" onClick={handleRemember} disabled={isFlipped && isLastCard && Object.keys(unsavedChanges).length > 0}>覚えた</Button>
          </div>
        ) : (
          // グングンモードがOFFの場合
          <div className="flex justify-center">
            {!isLastCard && (
                <Button variant="default" size="lg" onClick={goNext}>次の単語</Button>
            )}
            {/* useSpacedRepetitionがfalseで最後のカードの場合、goNextで遷移するため、ここではボタン不要 or 終了ボタンを出す */}
          </div>
        )}

        {/* 終了ボタンエリア */}
        <div className="mt-12 flex justify-center">
          {studySettings.useSpacedRepetition ? (
            <Button onClick={handleSaveAndExit} size="lg" variant="primary">
              保存して終了
            </Button>
          ) : (
            // useSpacedRepetitionがfalseで、かつ最後のカードが表示されている場合に「終了」ボタンを表示
            // (最後のカードで「次の単語」を押すとgoNext内で遷移するので、実質表示されないか、最後のカードの表示と同時に出す)
            // isLastCardの条件は、goNextが最後のカードの後に遷移するため、ここでの表示は実質的に不要になる可能性があります。
            // もし最後のカードが表示された時点で「終了」ボタンを出したい場合は、isLastCard で判定します。
             <Button onClick={() => startTransition(() => router.push('/dashboard'))} size="lg" variant="primary">
               終了
             </Button>
          )}
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