'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
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

interface Word {
  id: string
  front: string
  back: string
  created_at: string
}

interface Wordbook {
  id: string
  title: string
  created_at: string
}

export default function WordbookDetailPage({ params }: { params: { id: string } }) {
  const [wordbook, setWordbook] = useState<Wordbook | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editWords, setEditWords] = useState<{ id?: string, front: string, back: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchWordbook()
    fetchWords()
  }, [params.id])

  useEffect(() => {
    if (wordbook) setEditTitle(wordbook.title)
    if (words) setEditWords(words.map(w => ({ id: w.id, front: w.front, back: w.back })))
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
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('wordbook_id', params.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setWords(data || [])
    } catch (error) {
      console.error('Error fetching words:', error)
      setError('単語の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWord = async () => {
    if (!deleteTargetId) return
    try {
      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', deleteTargetId)
      if (error) throw error
      setDeleteDialogOpen(false)
      setDeleteTargetId(null)
      fetchWords()
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
    setSaveSuccess(false); // 保存開始時に成功メッセージをリセット
    try {
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
        const { error: addError } = await supabase
          .from('words')
          .insert(newWords.map(w => ({ ...w, wordbook_id: params.id })))
        if (addError) throw addError
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
        const { error: delError } = await supabase
          .from('words')
          .delete()
          .in('id', deletedIds)
        if (delError) throw delError
      }
      fetchWordbook()
      fetchWords()
      await new Promise(resolve => setTimeout(resolve, 500)); // 意図的な遅延 (例)
      setSaveSuccess(true); // 保存成功
      setTimeout(() => setSaveSuccess(false), 2000); // 2秒後に成功メッセージを消す
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton backUrl="/dashboard" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">単語帳編集</h1>
        <div className="flex space-x-2">
          <Link href={`/wordbooks/${params.id}/test`}>
            <Button variant="secondary">学習する</Button>
          </Link>
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
                  />
                  <Input
                    type="text"
                    placeholder="裏面 (例: りんご)"
                    value={word.back}
                    onChange={e => handleWordChange(idx, 'back', e.target.value)}
                  />
                  <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveWord(idx)} disabled={editWords.length === 1}>削除</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={handleAddWord}>単語を追加</Button>
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