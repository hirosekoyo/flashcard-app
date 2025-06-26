'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" // shadcn/uiのInputをインポート
import { Mail, Lock } from 'lucide-react' // アイコンをインポート

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  // ゲストユーザーの認証情報
  const GUEST_EMAIL = 'guest@geust.com';
  const GUEST_PASSWORD = 'guestguest';

  

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
        setIsSignUp(false); // 登録後はログイン表示に戻す
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (error: any) {
      setError(translateError(error.message))
    } finally {
      setLoading(false)
    }
  }
 
  // 英語のエラーメッセージを日本語に翻訳する関数
function translateError(errorMessage: string): string {
  const errorTranslations: { [key: string]: string } = {
    // エラーメッセージとその日本語訳
    'email rate limit exceeded': 'メールの送信制限を超えました。しばらく待ってから再試行してください。',
    'email_not_confirmed': 'メールアドレスが確認されていません。確認メールをチェックしてください。',
    'Email not confirmed': 'メールアドレスが確認されていません。確認メールをチェックしてください。',
    'over_email_send_rate_limit': 'メールの送信制限を超えました。しばらく待ってから再試行してください。',
    'email_already_in_use': 'このメールアドレスはすでに使用されています。',
    'invalid_email': 'メールアドレスが無効です。正しい形式を使用してください。',
    'missing email or phone': 'ログインに必要な項目が入力されていません。',
    'Anonymous sign-ins are disabled': 'ログインに失敗しました。',
    'User already registered': 'このユーザーは既に登録されています。',
    'Invalid login credentials': 'ログイン情報が誤っています。',
    'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります。',
    'validation_failed': '入力内容の検証に失敗しました。',
  };

  for (const errorKey in errorTranslations) {
    if (errorMessage.includes(errorKey)) {
      return errorTranslations[errorKey];
    }
  }

  return `エラー: ${errorMessage}`;
}


  // ゲストログイン処理
  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: GUEST_EMAIL,
        password: GUEST_PASSWORD,
      });
      if (error) throw error;
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* ロゴ・アプリ名・説明文 */}
      <div className="w-full max-w-md space-y-8 mb-8"> {/* mb-8を追加してCardとの間隔を調整 */}
        <div className="text-center">
          <div className="flex justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="#6366F1" fillOpacity="0.15" />
              <path d="M24 36V12M24 12C20.6863 12 18 14.6863 18 18C18 21.3137 20.6863 24 24 24C27.3137 24 30 21.3137 30 18C30 14.6863 27.3137 12 24 12Z" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">コツコツ単語帳</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-left">
            今日思い出すべき単語とまだ覚えていない単語だけを自動で出題して、効率よく学習を進めることができます。
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-left">今日思い出すべき単語は忘却曲線に沿った最適なタイミングで出題されます。</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-left">今日のノルマ＋αをコツコツ学習すれば着実に記憶に定着していきます。</p>
        </div>
      </div>

      {/* Cardの幅を統一 */}
      <Card className="w-full max-w-md">
        <CardHeader>
          {/* isSignUpに応じてタイトルと説明を変更 */}
          <CardTitle>{isSignUp ? '新規登録' : 'ログイン'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'メールアドレスとパスワードを設定してください。' : 'アカウントにログインして単語帳を始めましょう'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* space-y-6で入力欄の間隔を調整 */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* --- メールアドレス入力 (モダンデザイン) --- */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                メールアドレス
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
                <Input // Inputコンポーネントを使用
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="pl-10 h-10" // アイコン分のパディングと高さを指定
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* --- パスワード入力 (モダンデザイン) --- */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                パスワード
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
                <Input // Inputコンポーネントを使用
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="pl-10 h-10" // アイコン分のパディングと高さを指定
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            {/* --- 送信ボタン --- */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full" // shadcn/uiのButtonを使用
            >
              {loading
                ? isSignUp
                  ? '登録中...'
                  : 'ログイン中...'
                : isSignUp
                  ? '新規登録'
                  : 'ログイン'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4"> {/* space-y-4でボタンの間隔を調整 */}
          {/* --- ゲストログインボタン --- */}
          <Button
            type="button"
            variant="outline" // アウトラインスタイル
            className="w-full"
            onClick={handleGuestLogin} // ゲストログイン関数を呼び出す
            disabled={loading} // ログイン中は無効化
          >
            ゲストユーザーで使い方をみる
          </Button>

          {/* --- 新規登録/ログイン切り替え --- */}
          <div className="text-center">
            <span className="text-gray-600 text-sm dark:text-gray-400">
              {isSignUp ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでない方は'}{' '}
              <Button
                type="button"
                variant="link" // リンクスタイル
                className="text-indigo-600 hover:underline font-medium p-0 h-auto dark:text-indigo-400" // スタイル調整
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null) // 切り替え時にエラーをクリア
                }}
              >
                {isSignUp ? 'ログイン' : '新規登録'}
              </Button>
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}