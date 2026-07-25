import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100 flex flex-col items-center justify-center px-6">
      <p className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
        404
      </p>
      <h1 className="text-lg font-semibold mb-2">ページが見つかりません</h1>
      <p className="text-sm text-slate-500 mb-8">
        このURLは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-medium transition-colors"
      >
        ダッシュボードに戻る
      </Link>
    </div>
  );
}
