'use client'

import { useEffect, useState, startTransition } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSwipeable } from 'react-swipeable'

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

  // ゲストユーザーのメールアドレスを定義 
  const GUEST_EMAIL = 'guest@geust.com';

  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFlipped, setIsFlipped] = useState(false)
  const [progresses, setProgresses] = useState<Record<string, number>>({})  
  // const [mistake, setMistake] = useState<Record<string, number>>({}) // 不要なため削除
  const [studySettings, setStudySettings] = useState<StudySettings>({
    frontToBack: true,
    useSpacedRepetition: true,
  })
  const [wordbookIds, setWordbookIds] = useState<string[]>([])
  const [todayReviewWordsCount, setTodayReviewWordsCount] = useState(0);
  
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, ProgressUpdate>>({});

  // スライドアニメーション用のstate
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)
  const [isSliding, setIsSliding] = useState(false)

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
        setWords([]);
        setLoading(false);
    }
  }, [wordbookIds, studySettings.useSpacedRepetition]); 

  const getNextReviewDate = (level: number): string => {
    const date = new Date();
    let days = 1;
    switch (level) {
      case 0: days = 1; break;
      case 1: days = 2; break;
      case 2: days = 3; break;
      case 3: days = 5; break;
      case 4: days = 7; break;
      case 5: days = 14; break;
      case 6: days = 30; break;
      case 7: days = 90; break;
      case 8: days = 180; break;
      case 9: days = 180; break;
      case 10: days = 180; break;
      default: days = 1;
    }
    date.setDate(date.getDate() + days);
    return getFormattedDate(date); 
  };

  const handleSaveAndExit = async (finalChange?: ProgressUpdate) => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      startTransition(() => router.push('/login'));
      return;
    }
    if (user.email === GUEST_EMAIL) {
      alert('ゲストユーザーは学習進捗を記録できません。');
      startTransition(() => router.push('/dashboard'));
      return;
    }

    let changesToProcess = { ...unsavedChanges }; 

    if (finalChange) {
      changesToProcess[finalChange.word_id] = finalChange;
    }
  
    const updatesArray = Object.values(changesToProcess);

    if (updatesArray.length === 0) {
      startTransition(() => router.push('/dashboard'));
      return;
    }
  
  
    const updatesToPush = updatesArray.map(change => ({
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
      alert('進捗の保存中にエラーが発生しました。');
    } else {
      setUnsavedChanges({}); 
    }
    startTransition(() => router.push('/dashboard'));
  };

  const handleRemember = async () => {
    if (words.length === 0 || isSliding) return;
    const word = words[currentIndex];

    const currentProgressLevel = progresses[word.word_id] ?? word.level;
    const newLevel = Math.min(currentProgressLevel + 1, 10);
    const nextReview = getNextReviewDate(newLevel);

    setProgresses((prev) => ({ ...prev, [word.word_id]: newLevel }));

    const isLastCard = currentIndex === words.length - 1;

    if (studySettings.useSpacedRepetition) {
      const currentChange: ProgressUpdate = {
        word_id: word.word_id,
        wordbook_id: word.wordbook_id,
        level: newLevel,
        next_review_at: nextReview,
        mistake_count: word.mistake_count,
      };
      
      setUnsavedChanges(prev => ({
        ...prev,
        [word.word_id]: currentChange, 
      }));

      if (isLastCard) {
        await handleSaveAndExit(currentChange); 
        return; 
      }
    }

    // 右側にスライドアニメーション
    setSlideDirection('right');
    setIsSliding(true);
    
    setTimeout(() => {
      setSlideDirection(null);
      setIsSliding(false);
      setIsFlipped(false);
      goNext();
    }, 300);
  };

  const handleForget = async () => {
    if (words.length === 0 || isSliding) return;
    const word = words[currentIndex];
    
    setProgresses((prev) => ({ ...prev, [word.word_id]: 0 }));

    const isLastCard = currentIndex === words.length - 1;

    if (studySettings.useSpacedRepetition) {
      const currentChange: ProgressUpdate = {
        word_id: word.word_id,
        wordbook_id: word.wordbook_id,
        level: 0,
        next_review_at: null, 
        mistake_count: (word.mistake_count ?? 0) + 1,
      };

      setUnsavedChanges(prev => ({
        ...prev,
        [word.word_id]: currentChange,
      }));

      if (isLastCard) {
        await handleSaveAndExit(currentChange);
        return;
      }
    }

    // 左側にスライドアニメーション
    setSlideDirection('left');
    setIsSliding(true);
    
    setTimeout(() => {
      setSlideDirection(null);
      setIsSliding(false);
      setIsFlipped(false);
      goNext();
    }, 300);
  };

  const goNext = () => {
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < words.length) {
        setIsFlipped(false);
        return nextIndex;
      } else {
        if (!studySettings.useSpacedRepetition) {
          startTransition(() => router.push(`/dashboard`));
        }
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
          <p className="text-lg text-gray-500">出題されるカードはありません</p>
          {studySettings.useSpacedRepetition && (
            <p className="text-lg text-gray-500">コツコツモードをOFFにしてランダムに暗記しますか？</p>
          )}
          <Button
            onClick={() => startTransition(() => router.push(`/dashboard`))}
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
                 setUnsavedChanges({}); 
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

  const isLastCardForButtonDisplay = currentIndex === words.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto"> {/* 全体のコンテンツラッパー */}
        {/* 進捗表示と終了ボタンのコンテナ */}
        <div className="w-80 mx-auto flex justify-between items-center mb-4"> {/* カード幅(w-80)に合わせて中央寄せ */}
          <div className="h-[80px] flex flex-col justify-center"> {/* 高さを固定 */}
            {studySettings.useSpacedRepetition && todayReviewWordsCount > 0 ? (
              <>
                {currentIndex + 1 > todayReviewWordsCount && todayReviewWordsCount > 0 ? (
                  <div className="h-[60px] flex flex-col justify-center"> {/* ノルマ達成時の表示を中央寄せ */}
                    <span className="text-base font-bold text-green-600">ノルマ達成！</span>
                    <span className="text-sm text-gray-500 mt-1">{currentIndex + 1} / {words.length}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    <span>今日のノルマ: <span className="text-xl font-bold text-blue-600">{todayReviewWordsCount}</span>枚</span>
                    <br />
                    <span>学習レベル: <span className="text-xl font-bold text-blue-600">{progresses[currentWord.word_id] ?? currentWord.level}</span></span>
                    <br />
                    <span>{currentIndex + 1} / {words.length}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">
                {currentIndex + 1} / {words.length}
              </div>
            )}
          </div>
          <div>
            {studySettings.useSpacedRepetition ? (
              <Button onClick={() => handleSaveAndExit()} size="sm" variant="outline">
                保存して終了
              </Button>
            ) : (
              <Button 
                onClick={() => startTransition(() => router.push('/dashboard'))} 
                size="sm" 
                variant="outline"
              >
                終了
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div
            key={currentWord.word_id}  
            className={`relative w-full h-[calc(100vh-300px)] cursor-pointer perspective overflow-hidden`}
            onClick={() => setIsFlipped(f => !f)}
          >
            <div className={`absolute w-full h-full transition-all duration-300 [transform-style:preserve-3d] ${
              isFlipped ? 'rotate-y-180' : ''
            } ${
              slideDirection === 'right' ? (isFlipped ? 'slide-left' : 'slide-right') : 
              slideDirection === 'left' ? (isFlipped ? 'slide-right' : 'slide-left') : ''
            }`}>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center">
                <CardContent className="flex items-center justify-center h-full text-4xl font-bold p-4 text-center">
                  {frontContent}
                </CardContent>
              </Card>
              <Card className="absolute w-full h-full backface-hidden flex items-center justify-center rotate-y-180">
                <CardContent className="flex items-center justify-center h-full text-4xl font-bold p-4 text-center">
                  {backContent}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {studySettings.useSpacedRepetition ? (
          <div className="flex justify-between w-full max-w-md mx-auto">
            <Button 
              variant="destructive" 
              size="lg" 
              className="w-[45%]" 
              onClick={handleForget}
              disabled={isSliding}
            >
              覚えてない
            </Button>
            <Button 
              variant="default" 
              size="lg" 
              className="w-[45%]" 
              onClick={handleRemember}
              disabled={isSliding}
            >
              覚えた
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            {!isLastCardForButtonDisplay && (
                <Button variant="default" size="lg" onClick={goNext}>次のカード</Button>
            )}
          </div>
        )}
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
        .slide-right {
          transform: translateX(100%);
        }
        .slide-left {
          transform: translateX(-100%);
        }
        .rotate-y-180.slide-right {
          transform: rotateY(180deg) translateX(100%);
        }
        .rotate-y-180.slide-left {
          transform: rotateY(180deg) translateX(-100%);
        }
      `}</style>
    </div>
  )
}