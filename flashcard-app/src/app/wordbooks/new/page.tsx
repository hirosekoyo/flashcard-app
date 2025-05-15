'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Header from '@/components/Header'

export default function NewWordbookPage() {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [words, setWords] = useState([{ front: '', back: '' }])

  const handleWordChange = (idx: number, key: 'front' | 'back', value: string) => {
    setWords((prev) => prev.map((w, i) => i === idx ? { ...w, [key]: value } : w))
  }

  const handleAddWord = () => setWords((prev) => [...prev, { front: '', back: '' }])

  const handleRemoveWord = (idx: number) => setWords((prev) => prev.filter((_, i) => i !== idx))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ユーザーが見つかりません')

      const { data, error: wbError } = await supabase
        .from('wordbooks')
        .insert([{ title, user_id: user.id }])
        .select('id')
        .single()

      if (wbError) throw wbError

      const validWords = words.filter(w => w.front && w.back)
      if (validWords.length > 0) {
        const { error: wError } = await supabase
          .from('words')
          .insert(validWords.map(w => ({ ...w, wordbook_id: data.id })))

        if (wError) throw wError
      }

      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton backUrl="/dashboard" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">新規作成</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              新しい単語帳のタイトル
            </label>
            <Input
              type="text"
              id="title"
              required
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">単語リスト</label>
            <div className="space-y-2">
              {words.map((word, idx) => (
                <div key={idx} className="flex gap-2 items-center">
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
                  <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveWord(idx)} disabled={words.length === 1}>削除</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={handleAddWord}>単語を追加</Button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? '作成中...' : '作成'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 