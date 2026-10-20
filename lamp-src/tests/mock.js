// in-memory claude.use mock: db + user + sample, with fake group members
window.__mock=(()=>{
  const store=new Map(),subs=[];const ME=window.__me||"u_me";
  const fire=()=>subs.forEach(s=>s());
  const snapDoc=(p)=>({id:p.split("/").pop(),exists:store.has(p),data:()=>store.get(p),metadata:{}});
  const docRef=p=>({id:p.split("/").pop(),path:p,get:async()=>snapDoc(p),
    set:async d=>{store.set(p,JSON.parse(JSON.stringify(d)));fire()},
    update:async d=>{if(!store.has(p))throw {code:"invalid_argument"};const m=(a,b)=>{const o={...a};for(const[k,v]of Object.entries(b))o[k]=v&&typeof v==="object"&&!Array.isArray(v)&&o[k]&&typeof o[k]==="object"?m(o[k],v):v;return o};store.set(p,m(store.get(p),JSON.parse(JSON.stringify(d))));fire()},
    delete:async()=>{store.delete(p);fire()},
    onSnapshot:(n)=>{const f=()=>n(snapDoc(p));subs.push(f);setTimeout(f,10);return()=>{}},collection:c=>colRef(p+"/"+c)});
  const colRef=c=>({path:c,doc:id=>docRef(c+"/"+(id||Math.random().toString(36).slice(2))),
    onSnapshot:n=>{const f=()=>{const docs=[...store.keys()].filter(k=>k.startsWith(c+"/")&&k.split("/").length===c.split("/").length+1).map(snapDoc);n({docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{}})};subs.push(f);setTimeout(f,10);return()=>{}},
    get:async()=>{const docs=[...store.keys()].filter(k=>k.startsWith(c+"/")).map(snapDoc);return{docs}}});
  const db={doc:docRef,collection:colRef};
  const names={u_me:"Johan Velo",u_a:"Sarah Mokoena",u_b:"Pieter du Toit",u_c:"Lerato Khumalo"};
  const user={me:async()=>({id:ME,name:names[ME],avatarUrl:"",color:"#3B5BBA",isOwner:ME==="u_me",canEdit:true}),id:async()=>ME,can:async()=>true,isOwner:async()=>ME==="u_me",
    profiles:async ids=>Object.fromEntries([].concat(ids).map(id=>[id,{id,name:names[id]||"",avatarUrl:"",color:{u_me:"#3B5BBA",u_a:"#B5523B",u_b:"#2E7D57",u_c:"#A27A1D"}[id]||"#888",isMe:id===ME,guest:false}]))};
  window.claude={use:async n=>n==="db"?db:n==="user"?user:null};
  return {store,fire};
})();
