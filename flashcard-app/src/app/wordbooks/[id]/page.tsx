'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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

interface Word {
  id: string
  front: string
  back: string
  created_at: string
  level?: number // learning_progressから取得する場合のためにオプショナルにする
}

interface Wordbook {
  id: string
  title: string
  created_at: string
}

export default function WordbookDetailPage() {
  const params = useParams<{ id: string }>();
  const [wordbook, setWordbook] = useState<Wordbook | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editWords, setEditWords] = useState<{ id?: string, front: string, back: string, level?: number }[]>([]) 
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importText, setImportText] = useState('');
  const [importDelimiter, setImportDelimiter] = useState('tab');
  const [splitByNewline, setSplitByNewline] = useState(true);
  const [deleteWordbookDialogOpen, setDeleteWordbookDialogOpen] = useState(false);

  useEffect(() => {
    fetchWordbook()
    fetchWords()
  }, [params.id])

  useEffect(() => {
    if (wordbook) setEditTitle(wordbook.title)
    // words のデータが更新されたら editWords も更新
    if (words) setEditWords(words.map(w => ({ id: w.id, front: w.front, back: w.back, level: w.level })))
  }, [wordbook, words])

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ユーザーがログインしていません。');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('learning_progress')
        .select(`
          word_id,
          level,
          words!inner(id, front, back, created_at)
        `)
        .eq('user_id', user.id) // ユーザーIDでフィルタリング
        .eq('wordbook_id', params.id) // 単語帳IDでフィルタリング
        .order('level', { ascending: false }); // levelが高い順にソート

      if (error) throw error

      // 取得したデータをWordインターフェースに合うように変換
      const transformedWords: Word[] = data?.map((item: any) => ({
        id: item.words.id,
        front: item.words.front,
        back: item.words.back,
        created_at: item.words.created_at,
        level: item.level, // level を追加
      })) || [];

      setWords(transformedWords);
    } catch (error) {
      console.error('Error fetching words:', error)
      setError('単語の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWord = async () => {
    if (!deleteTargetId) return
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('ユーザーがログインしていません。');
      setDeleteDialogOpen(false);
      return;
    }

    try {
      // 1. learning_progress テーブルから削除
      const { error: lpError } = await supabase
        .from('learning_progress')
        .delete()
        .eq('word_id', deleteTargetId)
        .eq('user_id', user.id)
        .eq('wordbook_id', params.id); // wordbook_idも条件に加える

      if (lpError) throw lpError;

      // 2. words テーブルから削除
      const { error: wordsError } = await supabase
        .from('words')
        .delete()
        .eq('id', deleteTargetId)

      if (wordsError) throw wordsError;

      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      fetchWords(); 
    } catch (error) {
      console.error('Error deleting word:', error)
      setError('単語の削除に失敗しました')
    }
  }

  const handleWordChange = (idx: number, key: 'front' | 'back', value: string) => {
    setEditWords((prev) => prev.map((w, i) => i === idx ? { ...w, [key]: value } : w))
  }
  const handleAddWord = () => setEditWords((prev) => [...prev, { front: '', back: '' }])
  const handleRemoveWord = (idx: number) => setEditWords((prev) => prev.filter((_, i) => i !== idx))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaveSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("ユーザーがログインしていません。");
        setSaving(false);
        return;
      }

      // タイトル更新
      if (editTitle !== wordbook?.title) {
        const { error: tError } = await supabase
          .from('wordbooks')
          .update({ title: editTitle })
          .eq('id', params.id)
        if (tError) throw tError
      }

      // 単語の更新
      const existingIds = words.map(w => w.id)
      const newWords = editWords.filter(w => !w.id && w.front && w.back)
      const updatedWords = editWords.filter(w => w.id && (w.front !== words.find(ow => ow.id === w.id)?.front || w.back !== words.find(ow => ow.id === w.id)?.back))
      const deletedIds = existingIds.filter(id => !editWords.find(w => w.id === id))

      // 追加
      if (newWords.length > 0) {
        const { data: insertedWords, error: addErrorW } = await supabase
          .from('words')
          .insert(newWords.map(w => ({ ...w, wordbook_id: params.id}))) 
          .select('id')

        if (addErrorW) throw addErrorW

        if (!insertedWords || insertedWords.length === 0) {
          console.warn("新しい単語は挿入されましたが、IDが返されませんでした。学習進捗は追加されません。");
        }

        const progressRecords = insertedWords.map(insertedWord => ({
          user_id: user.id,
          word_id: insertedWord.id,
          wordbook_id: params.id,
          level: 0,
          mistake_count: 0,
          next_review_at: null,
        }));

        const { error: addErrorP } = await supabase
          .from('learning_progress')
          .insert(progressRecords)

        if (addErrorP) throw addErrorP
      }
      // 更新
      for (const w of updatedWords) {
        const { error: upError } = await supabase
          .from('words')
          .update({ front: w.front, back: w.back })
          .eq('id', w.id)
        if (upError) throw upError
      }
      // 削除
      if (deletedIds.length > 0) {
        // learning_progress から先に削除
        const { error: delLpError } = await supabase
          .from('learning_progress')
          .delete()
          .in('word_id', deletedIds)
          .eq('user_id', user.id)
          .eq('wordbook_id', params.id);

        if (delLpError) throw delLpError;

        // words から削除
        const { error: delWordsError } = await supabase
          .from('words')
          .delete()
          .in('id', deletedIds)
        if (delWordsError) throw delWordsError
      }
      fetchWordbook()
      fetchWords()
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleImportWords = useCallback(() => {
    if (!importText) return;

    const separator = importDelimiter === 'tab' ? '\t' : ',';
    const lines = splitByNewline ? importText.split(/\r\n|\r|\n/) : [importText];
    let newWords: string[] = [];
    let inQuote = false;
    let currentWord = '';

    lines.forEach(line => {
      const parts = line.split(separator);
      parts.forEach(part => {
        const trimmedPart = part.trim();
        if (inQuote) {
          currentWord += trimmedPart;
          if (trimmedPart.endsWith('"')) {
            inQuote = false;
            newWords.push(currentWord.slice(0, -1));
            currentWord = '';
          }
        } else {
          if (trimmedPart.startsWith('"')) {
            inQuote = true;
            currentWord = trimmedPart.slice(1);
            if (trimmedPart.endsWith('"')) {
              inQuote = false;
              newWords.push(currentWord.slice(0, -1));
              currentWord = '';
            }
          } else {
            newWords.push(trimmedPart);
          }
        }
      });
      if (inQuote) {
        currentWord += '\n';
      }
    });

    const newWordPairs: { id?: string, front: string, back: string }[] = [];
    for (let i = 0; i < newWords.length; i += 2) {
      const front = newWords[i] || '';
      const back = newWords[i + 1] || '';
      if (front || back) {
        newWordPairs.push({ front, back });
      }
    }

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
    setEditWords(prevWords => [...prevWords, ...uniqueNewWordPairs]);
    setImportText('');

    if (skippedCount > 0) {
      alert(`${skippedCount} 件の重複する単語がスキップされました。`);
    }

  }, [importDelimiter, importText, editWords, splitByNewline]);


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

  const handleRemoveWordbook = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ユーザーがログインしていません。');
        setDeleteWordbookDialogOpen(false);
        return;
      }

      // まず、関連する学習進捗データを削除する
      const { error: deleteProgressError } = await supabase
        .from('learning_progress')
        .delete()
        .eq('wordbook_id', params.id)
        .eq('user_id', user.id);

      if (deleteProgressError) throw deleteProgressError;

      // 次に、関連する単語を削除する
      const { error: deleteWordsError } = await supabase
        .from('words')
        .delete()
        .eq('wordbook_id', params.id)

      if (deleteWordsError) throw deleteWordsError;

      // 最後に、単語帳自体を削除する
      const { error: deleteWordbookError } = await supabase
        .from('wordbooks')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id); // user_id を条件に追加

      if (deleteWordbookError) throw deleteWordbookError;

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error deleting wordbook and associated data:', error);
      setError('単語帳と関連するデータの削除に失敗しました');
    } finally {
      setDeleteWordbookDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton backUrl="/dashboard" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">単語帳編集</h1>
        <div className="flex space-x-2 mb-4"> {/* mb-4 を追加して下のフォームとの間にスペースを設ける */}
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
        <form onSubmit={handleSave} className="space-y-6 mb-8">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">単語帳のタイトル</label>
            <Input
              type="text"
              id="title"
              required
              className="mt-1"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">単語リスト</label>
            <div className="space-y-2">
              {editWords.map((word, idx) => (
                <div key={word.id || idx} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    placeholder="表面 (例: apple)"
                    value={word.front}
                    onChange={e => handleWordChange(idx, 'front', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="text"
                    placeholder="裏面 (例: りんご)"
                    value={word.back}
                    onChange={e => handleWordChange(idx, 'back', e.target.value)}
                    className="flex-1"
                  />
                  {/* 学習レベル表示 */}
                    <span className="text-sm text-gray-600 w-24 text-right">レベル:  {word.level ?? 0}</span>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveWord(idx)}
                    disabled={editWords.length === 1} 
                  >
                    削除
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={handleAddWord}>単語を追加</Button>
              <label className="block text-sm font-medium text-gray-700 mt-4">
                タブ区切りまたはカンマ区切りで一括登録（重複は自動でスキップされます）
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="例: apple	りんご, banana	バナナ"
                rows={3}
                className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="tab"
                    checked={importDelimiter === 'tab'}
                    onChange={(e) => setImportDelimiter(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">タブ区切り</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="comma"
                    checked={importDelimiter === 'comma'}
                    onChange={(e) => setImportDelimiter(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">カンマ区切り</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={splitByNewline}
                    onCheckedChange={setSplitByNewline}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">改行を新しい単語として扱う</span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleImportWords}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md py-2 px-4 focus:outline-none focus:shadow-outline"
                >
                  インポート
                </Button>
              </div>
            </div>
          </div>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="flex justify-end space-x-4">
            <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
          {saveSuccess && <span className="text-green-500">保存完了！</span>}
        </form>
      </div>
    </div>
  )
}