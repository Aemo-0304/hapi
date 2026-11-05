// ===== 共用資料層（前台與後台都載入這個檔）=====
// 正式資料存在網站資料夾的 db.js（由後台寫入，網頁載入時會先讀它）。
// 瀏覽器（localStorage）只當作備份；兩邊都有時，取較新的那份。
(function(){
  var KEY="hapi-db-v2";

  function demo(){
    var GROUPS=[
      {id:"a",name:"Poppin’Party",hue:330,members:[
        {id:"kasumi",name:"戶山香澄",color:"#ff5522"},{id:"tae",name:"花園多惠",color:"#0077dd"},
        {id:"rimi",name:"牛込里美",color:"#ff55bb"},{id:"saaya",name:"山吹紗綾",color:"#ffc61a"},
        {id:"arisa",name:"市谷有咲",color:"#aa66dd"}]},{id:"b",name:"Roselia",hue:225},{id:"c",name:"Hello, Happy World!",hue:25},
      {id:"d",name:"RAISE A SUILEN",hue:170},{id:"e",name:"Morfonica",hue:280},{id:"f",name:"夢限大MewType",hue:45},{id:"g",name:"Ave Mujica",hue:0},{id:"h",name:"MyGO!!!!!",hue:200}
    ];
    var EVENTS=["初次登台","夏日祭典","星空演唱會","生日紀念","聖誕限定","新年福袋","週年慶","巡迴紀念","咖啡廳聯名","校園祭"];
    var PLACES=["線上商店","演唱會現場"];
    function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
    var r=rng(7),ITEMS=[];
    for(var i=0;i<96;i++){
      var g=GROUPS[Math.floor(r()*GROUPS.length)];
      var y=2022+Math.floor(r()*5),m=1+Math.floor(r()*12);
      var ev=EVENTS[Math.floor(r()*EVENTS.length)],pl=PLACES[Math.floor(r()*2)];
      r(); // 保留原本 icon 的亂數位置，讓示範資料與舊版一致
      ITEMS.push({id:i+1,group:g.id,year:y,month:m,event:ev,place:pl,name:g.name+" "+ev+" #"+(i+1),photo:"",member:""});
    }
    // 有團員的團體：示範資料平均分到「全團」與各團員（member 為 "all" 或團員 id）
    var mc={};
    ITEMS.forEach(function(d){
      var g=GROUPS.filter(function(x){return x.id===d.group})[0];
      if(g.members){var k=(mc[g.id]=(mc[g.id]||0)+1)%(g.members.length+1);d.member=k===0?"all":g.members[k-1].id}
    });
    return {groups:GROUPS,events:EVENTS,places:PLACES,items:ITEMS};
  }

  var Store={
    load:function(){
      var f=window.HAPI_DB||null,l=null;
      try{var s=localStorage.getItem(KEY);if(s)l=JSON.parse(s)}catch(e){}
      if(f&&l)return (l.updated||0)>(f.updated||0)?l:f;
      return f||l||demo();
    },
    // 後台會設定 Store.onSave，把資料寫進資料夾的 db.js
    onSave:null,
    save:function(db){
      db.updated=Date.now();
      var ok=true;
      try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){ok=false}
      if(Store.onSave){Store.onSave(db);return true}
      if(!ok)alert("儲存失敗：瀏覽器空間不足（照片太多或太大）。");
      return ok;
    },
    reset:function(){try{localStorage.removeItem(KEY)}catch(e){}return demo()},
    demo:demo,
    helpTitle:"使用說明",
    helpText:[
      "- **選團體**：點首頁的團體 LOGO，或上方的團體按鈕。",
      "- **選角色**：選了有團員的團體後，下方會出現「角色」列；左側「角色人物」可以一次勾選多位。",
      "- **篩選與搜尋**：用左側的發售年份、販售地點，或上方搜尋框找名稱、活動。",
      "- **看大圖**：點任一件法被就會放大顯示，點照片可看原圖。",
      "- **翻頁**：放大後用「上一個／下一個」或鍵盤左右鍵切換，按 Esc 關閉。",
      "- **深色模式**：點右上角 🌙／☀️ 切換。"
    ].join("\n"),
    // 說明文字格式：每行一段；「- 」開頭為項目符號；**文字** 為粗體；網址會變成連結
    helpHtml:function(text){
      var e=function(t){return t.replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
      var fmt=function(t){return e(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>')};
      var h="",inList=false;
      String(text||"").split(/\r?\n/).forEach(function(line){
        var t=line.trim();
        if(/^[-•]\s+/.test(t)){if(!inList){h+="<ul>";inList=true}h+="<li>"+fmt(t.replace(/^[-•]\s+/,""))+"</li>";return}
        if(inList){h+="</ul>";inList=false}
        if(t)h+="<p>"+fmt(t)+"</p>";
      });
      return h+(inList?"</ul>":"");
    }
  };
  window.Store=Store;
})();
