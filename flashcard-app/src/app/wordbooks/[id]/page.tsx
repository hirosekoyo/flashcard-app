'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader as DialogHeaderUI,
  DialogTitle as DialogTitleUI,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckedState } from '@radix-ui/react-checkbox'

interface Word {
  id: string
  front: string
  back: string
  level: number
}

interface Wordbook {
  id: string
  title: string
  created_at: string
}

// 編集中の単語の型 (新規追加時は id や level がない)
interface EditableWord {
  id?: string;
  front: string;
  back: string;
  level?: number;
  isSelected?: boolean; // チェックボックス用のフラグを追加
}

export default function WordbookDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const isNew = params.id === 'new'

  // ひろせ　ゲスト変数を共通するのと毎回ユーザーデータを取得するのでなく、格納したい。
  //今日のノルマを中央よせもう少し大きく
  //覚えた、覚えてないアニメーション、スワイプ送りは、なしでもいいか
  //新規登録時のメール送信なくす
  //単語制限
  //トグルswitchやチェックボックスのサイズを大きくする、switch切り替えの触覚フィードバックをつける？バウンススクロール pwa
  //pwa改善　https://tech.bitbank.cc/native-mobile-app-with-web-frontend/

  const [wordbook, setWordbook] = useState<Wordbook | null>(null)
  const [words, setWords] = useState<Word[]>([]) // DBの元データ
  const [editWords, setEditWords] = useState<EditableWord[]>([]) // 編集中のデータ
  const [deletedWordIds, setDeletedWordIds] = useState<string[]>([]) // 削除対象の単語IDリスト
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [importText, setImportText] = useState('')
  const [importDelimiter, setImportDelimiter] = useState('tab')
  const [splitByNewline, setSplitByNewline] = useState(true)
  const [deleteWordbookDialogOpen, setDeleteWordbookDialogOpen] = useState(false)

  const fetchWordbook = useCallback(async () => {
    if (isNew || !params.id) return
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
  }, [params.id, isNew])

  const fetchWords = useCallback(async () => {
    if (isNew || !params.id) {
      setLoading(false);
      return;
    }
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("ユーザーがログインしていません。")

      // wordsテーブルから直接単語を取得
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('id, front, back')
        .eq('wordbook_id', params.id)
        .order('created_at', { ascending: true })

      if (wordsError) throw wordsError

      // learning_progressテーブルからレベル情報を取得
      const { data: progressData, error: progressError } = await supabase
        .from('learning_progress')
        .select('word_id, level')
        .eq('user_id', user.id)
        .eq('wordbook_id', params.id)

      if (progressError) throw progressError

      // レベル情報をマップ化
      const levelMap = new Map(progressData?.map(p => [p.word_id, p.level]) || [])

      // 単語データとレベル情報を結合
      const transformedWords: Word[] = (wordsData || []).map(word => ({
        id: word.id,
        front: word.front || '',
        back: word.back || '',
        level: levelMap.get(word.id) || 0,
      }))

      setWords(transformedWords)
    } catch (error: unknown) {
      console.error('Error fetching words:', error)
      setError(error instanceof Error ? error.message : '単語の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [params.id, isNew])

  useEffect(() => {
    fetchWordbook()
    fetchWords()
  }, [fetchWordbook, fetchWords])

  useEffect(() => {
    if (isNew) {
      setEditTitle('');
      setEditWords([{ front: '', back: '', level: 0, isSelected: false }]);
    } else {
      if (wordbook) setEditTitle(wordbook.title);
      // レベル順（高い順）にソートしてから設定
      const sortedWords = words
        .map(w => ({ id: w.id, front: w.front, back: w.back, level: w.level, isSelected: false }))
        .sort((a, b) => (b.level || 0) - (a.level || 0));
      setEditWords(sortedWords);
    }
  }, [wordbook, words, isNew])

  const handleWordChange = (idx: number, key: 'front' | 'back', value: string) => {
    setEditWords((prev) => prev.map((w, i) => i === idx ? { ...w, [key]: value } : w))
  }

  const handleAddWord = () => setEditWords((prev) => [...prev, { front: '', back: '', level: 0, isSelected: false }])

  const handleRemoveSelectedWords = () => {
    const selectedWords = editWords.filter(w => w.isSelected);
    selectedWords.forEach(word => {
      if (word.id) {
        setDeletedWordIds((prev) => [...prev, word.id!]);
      }
    });
    setEditWords((prev) => prev.filter(w => !w.isSelected));
  };

  const handleWordSelection = (idx: number, checked: boolean) => {
    setEditWords((prev) => prev.map((w, i) => i === idx ? { ...w, isSelected: checked } : w));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("ユーザーがログインしていません。")
      //ゲスト制限
      // if (user.email === GUEST_EMAIL) {
      //   alert('ゲストユーザーは一部機能を制限しています。');
      //   return;
      // }

      const wordsToProcess = editWords.filter(w => w.front.trim() || w.back.trim());

      if (isNew) {
        // --- 新規作成処理 ---
        const { data: newWordbook, error: wbError } = await supabase
          .from('wordbooks')
          .insert({ title: editTitle, user_id: user.id })
          .select()
          .single();
        if (wbError) throw new Error(`単語帳作成エラー: ${wbError.message}`);
        if (!newWordbook) throw new Error("単語帳作成に失敗しました。");

        const newWordbookId = newWordbook.id;

        if (wordsToProcess.length > 0) {
          const newWordsData = wordsToProcess.map(w => ({
            front: w.front,
            back: w.back,
            wordbook_id: newWordbookId
          }));
          const { data: insertedWords, error: wError } = await supabase
            .from('words')
            .insert(newWordsData)
            .select('id');
          if (wError) throw new Error(`単語追加エラー: ${wError.message}`);
          if (!insertedWords) throw new Error("単語ID取得失敗");

          const progressRecords = insertedWords.map(iw => ({
            user_id: user.id,
            word_id: iw.id,
            wordbook_id: newWordbookId,
            level: 0,
            mistake_count: 0,
          }));
          const { error: pError } = await supabase
            .from('learning_progress')
            .insert(progressRecords);
          if (pError) throw new Error(`学習進捗追加エラー: ${pError.message}`);
        }

        setSaveSuccess(true);
        router.push(`/wordbooks/${newWordbookId}`);

      } else {
        // --- 編集処理 ---
        if (editTitle !== wordbook?.title) {
          const { error: tError } = await supabase
            .from('wordbooks')
            .update({ title: editTitle })
            .eq('id', params.id);
          if (tError) throw tError;
        }

        const originalWordsMap = new Map(words.map(w => [w.id, w]));

        const wordsToAdd = wordsToProcess.filter(w => !w.id);
        const wordsToUpdate = wordsToProcess.filter(w =>
          w.id &&
          originalWordsMap.has(w.id) &&
          (w.front !== originalWordsMap.get(w.id)?.front || w.back !== originalWordsMap.get(w.id)?.back)
        );
        const idsToDelete = deletedWordIds;

        if (idsToDelete.length > 0) {
          await supabase.from('learning_progress').delete().in('word_id', idsToDelete);
          await supabase.from('words').delete().in('id', idsToDelete);
        }
        if (wordsToAdd.length > 0) {
          const newWordsData = wordsToAdd.map(w => ({
            front: w.front, back: w.back, wordbook_id: params.id
          }));
          const { data: insertedWords, error: addWError } = await supabase
            .from('words').insert(newWordsData).select('id');
          if (addWError) throw addWError;
          if (!insertedWords) throw new Error("追加単語ID取得失敗");
          const progressRecords = insertedWords.map(iw => ({
            user_id: user.id, word_id: iw.id, wordbook_id: params.id, level: 0, mistake_count: 0
          }));
          await supabase.from('learning_progress').insert(progressRecords);
        }
        for (const w of wordsToUpdate) {
          if (w.id) {
            await supabase.from('words').update({ front: w.front, back: w.back }).eq('id', w.id);
          }
        }

        setDeletedWordIds([]);
        await fetchWordbook();
        await fetchWords();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  // パースされた単語リストを受け取り、重複を除いてstateに追加する共通関数
  const addUniqueWords = useCallback((newWordPairs: EditableWord[]) => {
    const existingWordSet = new Set(editWords.map(w => `${w.front.trim()}-${w.back.trim()}`));
    const uniqueNewWordPairs = newWordPairs.filter(pair => {
      const key = `${pair.front.trim()}-${pair.back.trim()}`;
      if (!existingWordSet.has(key) && (pair.front || pair.back)) {
        existingWordSet.add(key);
        return true;
      }
      return false;
    });

    const skippedCount = newWordPairs.length - uniqueNewWordPairs.length;
    setEditWords(prevWords => [...prevWords.filter(w => w.front.trim() || w.back.trim()), ...uniqueNewWordPairs]);
    if (skippedCount > 0) alert(`${skippedCount} 件の重複する単語がスキップされました。`);
  }, [editWords]);

  // テキストエリアからのインポート（UIの設定を反映）
  const handleImportFromText = () => {
    if (!importText) return;
    const separator = importDelimiter === 'tab' ? '\t' : ',';
    const lines = splitByNewline ? importText.split(/\r\n|\r|\n/) : [importText];

    const newWordPairs: EditableWord[] = [];
    lines.forEach(line => {
      if (line.trim() === '') return;
      const parts = line.split(separator);
      const front = parts[0]?.trim() || '';
      const back = parts[1]?.trim() || '';
      if (front || back) {
        newWordPairs.push({ front, back, level: 0, isSelected: false });
      }
    });
    addUniqueWords(newWordPairs);
    setImportText('');
  }

  // CSVファイルからのインポート（カンマ区切り・改行区切りで固定）
  const handleCsvFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split(/\r\n|\r|\n/);
        const newWordPairs: EditableWord[] = [];
        lines.forEach(line => {
          if (line.trim() === '') return;
          const parts = line.split(','); // CSVなのでカンマ区切りで固定
          const front = parts[0]?.trim() || '';
          const back = parts[1]?.trim() || '';
          if (front || back) {
            newWordPairs.push({ front, back, level: 0, isSelected: false });
          }
        });
        addUniqueWords(newWordPairs);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };


  const handleRemoveWordbook = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("ユーザーがログインしていません。")
    //ゲスト制限
    // if (user.email === GUEST_EMAIL) {
    //   alert('ゲストユーザーは一部機能を制限しています。');
    //   return;
    // }
    if (isNew || !params.id) return;
    try {
      await supabase.from('learning_progress').delete().eq('wordbook_id', params.id);
      await supabase.from('words').delete().eq('wordbook_id', params.id);
      await supabase.from('wordbooks').delete().eq('id', params.id);
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Error deleting wordbook:', error);
      setError('単語帳の削除に失敗しました');
    } finally {
      setDeleteWordbookDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>ダッシュボードに戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton backUrl="/dashboard" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {isNew ? '新しい単語帳を作成' : '単語帳編集'}
        </h1>

        {!isNew && (
          <div className="flex justify-end mb-4">
            <Dialog open={deleteWordbookDialogOpen} onOpenChange={setDeleteWordbookDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">単語帳を削除する</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeaderUI>
                  <DialogTitleUI>単語帳の削除</DialogTitleUI>
                  <DialogDescription>
                    本当にこの単語帳を削除しますか？削除すると、単語帳に含まれる全ての単語と学習進捗も削除されます。この操作は取り消せません。
                  </DialogDescription>
                </DialogHeaderUI>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">キャンセル</Button>
                  </DialogClose>
                  <Button type="button" variant="destructive" onClick={handleRemoveWordbook}>削除</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 mb-8 bg-white p-6 rounded-lg shadow">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">単語帳のタイトル</label>
            <Input
              type="text"
              id="title"
              required
              className="mt-1"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="新しい単語帳の名前"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">単語リスト {isNew ? '' : '(学習レベル順)'}</label>
            <div className="space-y-2">
              {editWords.map((word, idx) => (
                <div key={word.id || `new-${idx}`} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center justify-center w-12">
                      {!isNew && (
                        <span className="text-xs text-gray-600">
                          Lv: {word.level ?? 'N/A'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="表"
                        value={word.front}
                        onChange={e => handleWordChange(idx, 'front', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-center w-4">
                      <Checkbox
                        checked={word.isSelected || false}
                        onCheckedChange={(checked) => handleWordSelection(idx, checked as boolean)}
                        className="h-6 w-6 flex-shrink-0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12"></div>
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="裏"
                        value={word.back}
                        onChange={e => handleWordChange(idx, 'back', e.target.value)}
                      />
                    </div>
                    <div className="w-4"></div>
                  </div>
                  {idx < editWords.length - 1 && (
                    <div className="border-b border-gray-200 my-2"></div>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center">
                <Button type="button" variant="secondary" size="sm" onClick={handleAddWord}>単語を追加</Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveSelectedWords}
                >
                  選択項目を削除
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t mt-6">
            <h3 className="text-lg font-medium text-gray-800">一括登録</h3>

            <div className="mt-4 p-4 border rounded-md">
              <label className="block text-sm font-medium text-gray-700">1. テキストからインポート</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="テキストをここに貼り付け&#13;&#10;例: apple	りんご (改行) banana	バナナ"
                rows={3}
                className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input type="radio" value="tab" checked={importDelimiter === 'tab'} onChange={(e) => setImportDelimiter(e.target.value)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <span className="text-sm font-medium text-gray-700">タブ区切り</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" value="comma" checked={importDelimiter === 'comma'} onChange={(e) => setImportDelimiter(e.target.value)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <span className="text-sm font-medium text-gray-700">カンマ区切り</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox id="split-newline-cb" checked={splitByNewline} onCheckedChange={(checked: CheckedState) => setSplitByNewline(checked as boolean)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="split-newline-cb" className="text-sm font-medium text-gray-700">改行で単語を区切る</label>
                </label>
              </div>
              <div className="mt-2">
                <Button type="button" size="sm" onClick={handleImportFromText} className="bg-blue-600 hover:bg-blue-700 text-white">テキストをインポート</Button>
              </div>
            </div>

            <div className="mt-4 p-4 border rounded-md">
              <label className="block text-sm font-medium text-gray-700">2. CSVファイルからインポート</label>
              <p className="text-xs text-gray-500 mt-1">カンマ区切りのCSVファイルを選択してください。(1列目:表面, 2列目:裏面)</p>
              <div className="mt-2">
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvFileImport}
                />
                <Button type="button" size="sm" asChild className="bg-green-600 hover:bg-green-700 text-white">
                  <label htmlFor="csv-upload">CSVインポート</label>
                </Button>
              </div>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="flex justify-end items-center space-x-4">
            {saveSuccess && <span className="text-green-500">{isNew ? '作成しました！' : '保存完了！'}</span>}
            <Button type="submit" disabled={saving}>{saving ? '保存中...' : (isNew ? '作成' : '保存')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}