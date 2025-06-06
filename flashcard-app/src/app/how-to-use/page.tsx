import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Header from '@/components/Header'

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton backUrl="/dashboard" />
      <h1 className="text-3xl font-bold mb-8">使い方ガイド</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. ログイン</CardTitle>
            <CardDescription>アカウントにログインして学習を始めましょう</CardDescription>
          </CardHeader>
          <CardContent>
            <p>右上のログインボタンから、アカウントにログインしてください。新規の方は、アカウントを作成することができます。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. 単語帳の作成</CardTitle>
            <CardDescription>学習したい単語を登録しましょう</CardDescription>
          </CardHeader>
          <CardContent>
            <p>ダッシュボードから「新しい単語帳を作成」を選択し、単語帳のタイトルを入力します。その後、単語とその意味を追加していきます。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. 学習の開始</CardTitle>
            <CardDescription>フラッシュカードで効率的に学習</CardDescription>
          </CardHeader>
          <CardContent>
            <p>作成した単語帳を選択し、「学習を開始」ボタンをクリックすると、フラッシュカード形式で学習を始めることができます。カードをタップすると意味が表示されます。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. 進捗管理</CardTitle>
            <CardDescription>学習の進捗を確認しましょう</CardDescription>
          </CardHeader>
          <CardContent>
            <p>ダッシュボードで各単語帳の学習進捗を確認できます。苦手な単語は自動的に復習に追加されます。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. カスタマイズ</CardTitle>
            <CardDescription>学習を自分流にカスタマイズ</CardDescription>
          </CardHeader>
          <CardContent>
            <p>設定から学習の表示方法や復習の頻度などをカスタマイズすることができます。自分に最適な学習環境を作りましょう。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 