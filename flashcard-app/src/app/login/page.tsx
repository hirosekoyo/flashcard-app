'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('確認メールを送信しました。メールをご確認ください。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/wordbooks')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f8ff] py-8 px-4">
      {/* ロゴ・アプリ名・説明文 */}
      <div className="w-full max-w-md mx-auto mb-8">
        <div className="flex flex-col items-center">
          {/* ロゴ（SVG例） */}
          <div className="mb-4">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="#6366F1" fillOpacity="0.15"/>
              <path d="M24 36V12M24 12C20.6863 12 18 14.6863 18 18C18 21.3137 20.6863 24 24 24C27.3137 24 30 21.3137 30 18C30 14.6863 27.3137 12 24 12Z" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">忘却曲線単語帳</h1>
          <p className="text-center text-gray-600 text-sm mb-2">
            忘却曲線を用いた今までにない単語帳アプリ。自動で自分用の忘却曲線に沿った単語帳を作成して忘れる前に出題してくれる。記憶に定着しやすい。
          </p>
        </div>
      </div>

      {/* ログインフォーム */}
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-1">{isSignUp ? '新規登録' : 'ログイン'}</h2>
        <p className="text-gray-600 text-sm mb-6">
          {isSignUp ? 'メールアドレスとパスワードで新規登録できます' : 'アカウントにログインして単語帳を始めましょう'}
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="example@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-medium text-base mt-2"
          >
            {loading
              ? isSignUp
                ? '登録中...'
                : 'ログイン中...'
              : isSignUp
              ? '新規登録'
              : 'ログイン'}
          </button>
        </form>
        <button
          type="button"
          className="w-full mt-4 py-2 px-4 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-base"
          onClick={() => alert('ゲストログインは未実装です')}
        >
          ゲストとして利用する
        </button>
        <div className="text-center mt-4">
          <span className="text-gray-600 text-sm">
            アカウントをお持ちでない方は{' '}
            <button
              type="button"
              className="text-indigo-600 hover:underline font-medium"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'ログイン' : '新規登録'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
} 