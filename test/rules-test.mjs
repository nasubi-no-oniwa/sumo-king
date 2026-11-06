// ランキングのルールの試験（GitHub の上で Firebase の試し用データベースを立てて試す。本番のデータには触らない）
const NS='ft-green-default-rtdb',PROJ='ft-green',BASE='http://127.0.0.1:9000';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const tok=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({uid,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:PROJ,iss:'https://securetoken.google.com/'+PROJ,provider_id:'anonymous',firebase:{sign_in_provider:'anonymous'}})+'.';
async function req(method,path,uid,body){const r=await fetch(BASE+'/'+path+'.json?ns='+NS+(uid?'&auth='+tok(uid):''),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const ex=(name,res,want)=>{const ok=res.ok===want;console.log((ok?'OK  ':'NG  ')+name+' → '+res.status);if(!ok){fail++;console.log(JSON.stringify(res.j));}};
const TS={'.sv':'timestamp'};
const U='user1aaaaaaaaaaaaaaaaaaa',U2='user2bbbbbbbbbbbbbbbbbbb';
async function ticket(uid){const r=await req('PUT','sumo/runs/'+uid,uid,{t:TS});const g=await req('GET','sumo/runs/'+uid,uid);return {r,st:g.j&&g.j.t};}
const rec=(st,s,n='テスト',k=150)=>({n,s,st,k,v:1,t:TS});
const dk=()=>Math.floor((Date.now()+32400000)/86400000);

ex('ログインなしで吹きはじめる',await req('PUT','sumo/runs/'+U,null,{t:TS}),false);
let tk=await ticket(U);ex('吹きはじめた時刻を書く',tk.r,true);
ex('ほかの人の場所に書く',await req('PUT','sumo/runs/'+U,U2,{t:TS}),false);
ex('すぐにもう一度書く',await req('PUT','sumo/runs/'+U,U,{t:TS}),false);
ex('まだ吹いている途中に10秒の記録を送る',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,10000)),false);
await sleep(4200);
ex('吹きはじめた時刻がちがう記録',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st-5000,4000)),false);
ex('実際の時間より長い記録（20秒）',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,20000)),false);
ex('1秒より短い記録',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,900)),false);
ex('体重がおかしい記録',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,4000,'テスト',10)),false);
ex('ほかの人の場所に書く',await req('PUT','sumo/all/scores/'+U2,U,rec(tk.st,4000)),false);
ex('ふつうの記録（4秒）',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,4000)),true);
ex('今日のランキングに書く',await req('PUT','sumo/d/scores/'+U,U,{...rec(tk.st,4000),dk:dk()}),true);
ex('今日のランキングに、ちがう日で書く',await req('PUT','sumo/d/scores/'+U2,U2,{...rec(tk.st,4000),dk:dk()-1}),false);
ex('同じ回でもう一度送る（秒数を増やす）',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,4100)),false);
ex('しこ名だけ変える',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,4000,'なまえ')),true);
ex('今日のほうもしこ名だけ変える',await req('PUT','sumo/d/scores/'+U,U,{...rec(tk.st,4000,'なまえ'),dk:dk()}),true);
ex('しこ名を変えるふりで秒数を変える',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,4050,'なまえ')),false);
ex('しこ名を変えるふりで体重を変える',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,4000,'なまえ',90)),false);
ex('13文字の名前',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,4000,'あいうえおかきくけこさしす')),false);
await sleep(2100);
tk=await ticket(U);await sleep(3200);
ex('前より悪い記録は全期間に載らない',await req('PUT','sumo/all/scores/'+U,U,rec(tk.st,3000)),false);
ex('今日のほうも前より悪い記録は載らない',await req('PUT','sumo/d/scores/'+U,U,{...rec(tk.st,3000),dk:dk()}),false);
ex('禁煙した',await req('PUT','sumo/quit/'+U,U,{t:TS}),true);
ex('すぐにもう一度禁煙した',await req('PUT','sumo/quit/'+U,U,{t:TS}),false);
ex('ほかの人を禁煙させる',await req('PUT','sumo/quit/'+U2,U,{t:TS}),false);
ex('だれでもランキングを読める',await req('GET','sumo/all/scores',null),true);
ex('だれでも今日のランキングを読める',await req('GET','sumo/d/scores',null),true);
ex('禁煙した人の数を読める',await req('GET','sumo/quit',null),true);
ex('ほかの人の吹きはじめの時刻は読めない',await req('GET','sumo/runs/'+U,U2),false);
ex('hidden に書く',await req('PUT','sumo/hidden/'+U,U,true),false);
ex('ほかの場所に書く',await req('PUT','ft_cells/1/1',U,{n:1}),false);
console.log(fail?('失敗 '+fail+' 件'):'すべて合格');
if(fail)process.exit(1);
