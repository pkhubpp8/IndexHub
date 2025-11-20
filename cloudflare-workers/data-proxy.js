/**
 * IndexHub Data Proxy Worker
 * 简单代理新浪API（保留原功能）
 */

export default {
  async fetch(request, env, ctx) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || "s_sh000001";
    const url = `https://hq.sinajs.cn/list=${code}`;
    const res = await fetch(url, {
      headers: {
        "Referer": "https://finance.sina.com.cn/",
        "User-Agent": "Mozilla/5.0"
      }
    });
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder("gb2312");
    const text = decoder.decode(buffer);
    return new Response(text, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
}
