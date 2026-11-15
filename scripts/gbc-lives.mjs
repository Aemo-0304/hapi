// 從 ガールズバンドクライ 官網 LIVE 頁抓活動資料，輸出 gbc-lives.json
// 由 GitHub Actions（.github/workflows/gbc-lives.yml）每天執行
import { writeFileSync } from "node:fs";

const BASE = "https://girls-band-cry.com";
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };

function decode(s) {
  return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)));
}
function toText(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|dd|dt|tr)>/gi, "\n").replace(/<[^>]+>/g, ""))
    .split("\n").map(l => l.replace(/[\s　]+/g, " ").trim()).filter(Boolean);
}
const pad = n => String(n).padStart(2, "0");

export function parseList(html) {
  const out = [];
  const re = /<li class="sw-List_Item">([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html))) {
    const href = (m[1].match(/href="([^"]+)"/) || [])[1];
    const img = (m[1].match(/<img[^>]+src="([^"]+)"/) || [])[1] || "";
    const ttl = (m[1].match(/class="ttl">([\s\S]*?)<\/div>/) || [])[1] || "";
    if (href && /\/live\/post-/.test(href)) out.push({ link: new URL(href, BASE).href, img, title: decode(ttl.replace(/<[^>]+>/g, "")).trim() });
  }
  return out;
}

export function parseDetail(html, title) {
  const lines = toText(html);
  const i = lines.findIndex(l => /^■\s*(開催日時|開催日|日時|公演日)/.test(l));
  const dates = [];
  if (i >= 0) {
    let cur = null;
    for (let k = i + 1; k < lines.length && !/^■/.test(lines[k]); k++) {
      const l = lines[k];
      const ds = [...l.matchAll(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g)];
      if (ds.length) {
        // 「2027年3月20日（土）・21日（日）」這種只寫日的也一起抓
        const y = ds[0][1], mo = ds[0][2];
        const all = ds.map(d => `${d[1]}-${pad(d[2])}-${pad(d[3])}`);
        const rest = l.slice(ds[ds.length - 1].index + ds[ds.length - 1][0].length);
        for (const d of rest.matchAll(/[・、～~]\s*(\d{1,2})日/g)) all.push(`${y}-${pad(mo)}-${pad(d[1])}`);
        const after = rest.replace(/[（(][^）)]*[）)]/g, "").replace(/[・、～~]\s*\d{1,2}日/g, "")
          .replace(/(OPEN|START|開場|開演)\s*[:：]?\s*\d{1,2}[:：]\d{2}\s*[\/／]?\s*/gi, "").trim();
        cur = { dates: all, place: after.length > 1 ? after : "" };
        dates.push(cur);
        continue;
      }
      if (/OPEN|START|開場|開演/i.test(l) || /^[※＊*]/.test(l)) continue;
      if (cur && !cur.place) cur.place = l;
    }
  }
  const body = title + "\n" + lines.join("\n");
  const groups = [];
  if (/トゲナシトゲアリ|TOGENASHI/i.test(body) || /ガールズバンドクライ/.test(title)) groups.push("tgtg");
  if (/ダイヤモンドダスト|Diamond\s*Dust/i.test(body) || /ガールズバンドクライ/.test(title)) groups.push("dd");
  const items = [];
  for (const d of dates) for (const day of d.dates) items.push({ date: day, place: d.place });
  return { groups, items };
}

async function get(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(url + " → " + r.status);
  return r.text();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const list = parseList(await get(BASE + "/live/")).slice(0, 12);
  if (!list.length) throw new Error("列表頁沒有抓到任何活動，網站版面可能改了");
  const events = [];
  for (const e of list) {
    try {
      const d = parseDetail(await get(e.link), e.title);
      events.push({ ...e, ...d });
    } catch (err) { console.error(String(err)); }
  }
  writeFileSync("gbc-lives.json", JSON.stringify({ updated: new Date().toISOString(), source: BASE + "/live/", events }, null, 1));
  console.log(`抓到 ${events.length} 筆活動`);
}
