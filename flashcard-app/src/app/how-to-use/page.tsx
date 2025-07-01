import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Header from '@/components/Header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <Header showBackButton backUrl="/dashboard" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">使い方ガイド</h1>
        
        <div className="grid gap-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">1. まずはじめに</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">メールアドレスを登録してアカウントを作成すると、単語帳作成や忘却曲線に沿った単語テストができるようになります。</p>
              <p className="text-foreground">また、スマートフォンのホーム画面に追加していただくとスマホアプリのように使用することができます。</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">2. 単語帳の作成</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">CSVファイルの取り込みや表計算ソフトからテキストをコピペして一括登録することもできます。PCからの作業がおすすめです。インポートするテキストはご自身で作成するのも良いですが、「高校3年生　英単語　CSV」で検索したり、「TOEIC600点を取得するために重要な単語を50個挙げて。英語、日本語訳の順番にカンマ区切りでお願い！」と生成AIに作成してもらうのもおすすめです。</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">3. テスト</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">作成した単語帳を選択し、「学習を開始」ボタンをタップすると、フラッシュカード形式で学習を始めることができます。カードをタップすると裏面が表示されます。基本的にはコツコツモードをオンにして、今日のノルマ＋αを目標にテストを行ってください。</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">4. アプリの特徴</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">今日思い出すべき単語は忘却曲線に沿って最適なタイミングで出題されます。今日思い出すべき単語のみ出題されるため、既に覚えている単語の学習時間を短縮することができます。</p>
            </CardContent>
            <CardContent className="flex flex-col items-center">
              <div className="w-full max-w-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">学習レベル</TableHead>
                      <TableHead className="text-center">次の復習までの日数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { level: 0, days: "1日" },
                      { level: 1, days: "2日" },
                      { level: 2, days: "3日" },
                      { level: 3, days: "5日" },
                      { level: 4, days: "7日" },
                      { level: 5, days: "14日" },
                      { level: 6, days: "30日" },
                      { level: 7, days: "90日" },
                      { level: 8, days: "180日" },
                      { level: 9, days: "180日" },
                      { level: 10, days: "180日" }
                    ].map(({ level, days }) => (
                      <TableRow key={level}>
                        <TableCell className="text-center">レベル {level}</TableCell>
                        <TableCell className="text-center">{days}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardHeader>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">覚えていない単語は、学習レベルがリセットされて間違えた回数も記録します。テストでは今日のノルマ単語の後に、間違えた回数の多い単語から出題されるため、なかなか覚えられない単語に触れる機会が自動的に多くなります。</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-primary">5. 開発者への支援</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">このアプリが良いと思って頂けたら、家族・友人・知人へのご紹介や、SNSで共有して頂けると開発者が喜びます。また、ご意見・お問い合わせ・Amazonギフト券での寄付をメールアドレスにて承っております。利用者様の声がサービスの継続や拡大の励みになりますので、何卒よろしくお願いします。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}