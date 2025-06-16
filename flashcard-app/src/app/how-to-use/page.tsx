import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Header from '@/components/Header'

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <Header showBackButton backUrl="/dashboard" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">使い方ガイド</h1>
        
        <div className="grid gap-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">1. ログイン</CardTitle>
              <CardDescription>アカウントにログインして学習を始めましょう</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">メールアドレスを登録してアカウントを作成すると、単語帳作成や忘却曲線に沿った単語テストができるようになります。</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">2. 単語帳の作成</CardTitle>
              <CardDescription>学習したい単語を登録しましょう</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">ダッシュボードから「新しい単語帳を作成」を選択し、単語帳のタイトルを入力します。その後、単語とその意味を追加していきます。CSVファイルの取り込みや表計算ソフトからテキストをコピペして一括登録することもできます。PCからの作業がおすすめです。インポートするテキストはご自身で作成するのも良いですが、「高校3年生　英単語　CSV」で検索したり、「TOEIC600点を取得するために重要な単語を50個挙げて。英語、日本語訳の順番にカンマ区切りでお願い！」と生成AIに作成してもらうのもおすすめです。</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">3. テスト</CardTitle>
              <CardDescription>フラッシュカードで効率的に学習</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">作成した単語帳を選択し、「学習を開始」ボタンをクリックすると、フラッシュカード形式で学習を始めることができます。カードをタップすると意味が表示されます。基本的にはコツコツモードをオンにして、今日のノルマ＋αを目標にテストを行ってください。忘却曲線に沿った今日思い出すべき単語とまだ覚えていない単語のみ出題されるため、効率よくサクサクと学習を進めることができます。</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">4. アプリの特徴</CardTitle>
              <CardDescription>学習の進捗を確認しましょう</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">ダッシュボードで各単語帳の学習進捗を確認できます。苦手な単語は自動的に復習に追加されます。</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">5. 開発者への支援</CardTitle>
              <CardDescription>学習を自分流にカスタマイズ</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">このアプリが良いと思って頂けたら、家族・友人・知人へのご紹介や、SNSで共有して頂けると開発者が喜びます。また、ご意見・お問い合わせ・Amazonギフト券の寄付をメールアドレスにて承っております。利用者様の直接の声がサービスの継続や拡張のモチベーションになりますので、何卒よろしくお願いします。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}