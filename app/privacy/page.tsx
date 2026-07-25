import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | PlayCastr",
};

const SECTIONS = [
  {
    title: "収集する情報",
    body: "本サービスは、ユーザーがログインする機能を持ちません。サービス改善のため、Google Analytics によりページビュー・操作ログ（匿名）を収集しています。これらの情報に個人を特定できる情報は含まれません。",
  },
  {
    title: "Twitch データについて",
    body: "ゲームの視聴者数・配信チャンネル数は Twitch Helix API から定期取得し、当サービスのデータベースに保存しています。Twitch 側のプライバシーポリシーについては Twitch の公式サイトをご確認ください。",
  },
  {
    title: "Cookie の使用",
    body: "本サービスは、ウォッチリスト機能のためにブラウザの localStorage を使用します。また Google Analytics の計測のために Cookie を使用します。ブラウザの設定により Cookie を無効化できますが、一部機能が利用できなくなる場合があります。",
  },
  {
    title: "第三者への提供",
    body: "取得した情報を、法令に基づく場合を除き第三者に提供することはありません。",
  },
  {
    title: "ポリシーの変更",
    body: "本ポリシーは予告なく変更する場合があります。変更後はこのページに掲載します。",
  },
  {
    title: "お問い合わせ",
    body: "本ポリシーに関するご質問は、お問い合わせフォームよりお寄せください。",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-purple-400">Play</span>
            <span className="text-cyan-400">Castr</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-slate-500 mb-10">最終更新: 2026年6月10日</p>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-semibold text-purple-300 mb-2">{s.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
              {s.title === "お問い合わせ" && (
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScUXUXb8E8tb9p-Sc5lyJqwFVqaDVhlyMAjMA7lRS9fVaj6XA/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  お問い合わせフォーム →
                </a>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            ← ダッシュボードに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
