// middleware.js

// 簡易的なIPアドレスごとのアクセス記録用の一時メモリ
const ipCache = new Map();

export default function middleware(request) {
  // アクセスしてきた人のIPアドレスを取得（Vercelの環境変数から取得）
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  
  // 現在の時刻を取得
  const now = Date.now();
  
  // そのIPアドレスの過去の記録を呼び出す（なければ新しく作る）
  const userRecord = ipCache.get(ip) || { count: 0, startTime: now };
  
  // 過去1分間（60,000ミリ秒）以内のアクセスかどうかを判定
  if (now - userRecord.startTime < 60000) {
    userRecord.count++; // アクセス回数を1増やす
    
    // 1分間に「15回」以上アクセスしてきたら、攻撃とみなして弾く
    if (userRecord.count > 15) {
      return new Response('アクセスが多すぎます。しばらく待ってからやり直してください。', {
        status: 429,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  } else {
    // 1分以上経過していたら、カウントをリセットしてやり直し
    userRecord.count = 1;
    userRecord.startTime = now;
  }
  
  // 記録を更新
  ipCache.set(ip, userRecord);
  
  // 制限に引っかからなければ、通常通りアプリの画面を表示させる
  return new Response(null, {
    headers: { 'x-middleware-next': '1' }
  });
}

// どの画面（URL）にアクセスしたときにこの門番を働かせるか設定
export const config = {
  // 今回はすべての画面へのアクセスに対して門番を立たせます
  matcher: '/(.*)',
};