/* ================= Diagrams ================= */
let GEO=null,geoPromise=null;
function loadGeo(){if(!geoPromise)geoPromise=fetch("geo.json").then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>(GEO=j)).catch(()=>{geoPromise=null;return null});return geoPromise}
const GPx=(m,lat,lon)=>[+(m.w/2+m.k*(lon-m.lon0)*m.c).toFixed(1),+(m.k*(m.lat1-lat)).toFixed(1)];
const RIVERS={
  euphrates:[[38.8,38.75],[37.6,38.3],[37.03,37.98],[36.82,38.01],[36.3,38.3],[35.95,39.01],[35.33,40.14],[34.45,40.92],[34.13,42.38],[33.42,43.3],[33.35,43.78],[32.54,44.42],[31.8,45.0],[31.31,45.28],[31.05,46.26],[31.0,47.43],[30.5,47.8],[29.95,48.55]],
  tigris:[[38.3,39.6],[37.91,40.24],[37.33,42.19],[36.34,43.13],[35.5,43.3],[34.6,43.68],[34.2,43.87],[33.31,44.37],[32.5,45.82],[31.84,47.15],[31.0,47.43]],
  nile:[[27.18,31.18],[28.1,30.75],[29.07,31.1],[30.04,31.24],[30.2,31.15]],
  rosetta:[[30.2,31.15],[30.7,30.8],[31.2,30.5],[31.47,30.37]],
  damietta:[[30.2,31.15],[30.75,31.25],[31.2,31.6],[31.52,31.84]],
  jordan:[[33.22,35.62],[32.89,35.6],[32.7,35.58],[32.4,35.58],[32.1,35.54],[31.77,35.56]]
};
const LAKES=[[[32.89,35.59],[32.88,35.64],[32.8,35.65],[32.71,35.62],[32.7,35.58],[32.78,35.52],[32.85,35.53]],[[31.77,35.56],[31.75,35.59],[31.5,35.58],[31.25,35.53],[31.1,35.48],[31.05,35.42],[31.12,35.39],[31.45,35.45],[31.7,35.48]]];

const FIGS={
abraham:{t:"Abraham's journey",k:"Map · Genesis 11–25",ref:[["Genesis 12","GEN",12]],
  sum:"About 1,500 km on foot with flocks and family, from a great city on the Euphrates to a promised land he never owned.",
  map:{id:"abraham",rivers:["euphrates","tigris","nile","rosetta","damietta","jordan"],
    waters:[["Mediterranean Sea",34.0,31.4],["Persian Gulf",29.25,48.6,"end"]],
    regions:[["MESOPOTAMIA",33.9,43.9],["ARAM",35.6,37.4],["CANAAN",30.55,35.15],["EGYPT",28.9,30.3],["ARABIAN DESERT",31.4,40.6]],
    routes:[{c:"c2",l:"Ur to Canaan",pts:[[30.96,46.1],[31.31,45.28],[32.54,44.42],[33.42,43.3],[34.13,42.38],[34.45,40.92],[35.33,40.14],[35.95,39.01],[36.86,39.03],[36.2,37.16],[33.51,36.29],[32.21,35.28],[31.93,35.22]]},
            {c:"c3",l:"To Egypt and back",dash:1,pts:[[31.93,35.22],[31.2,34.75],[30.95,33.6],[30.85,31.9],[30.7,31.4],[30.95,32.3],[31.1,33.8],[31.53,35.1]]}],
    stops:[["Ur",30.96,46.1,"e",1,"ur"],["Harran",36.86,39.03,"e",1,"harran"],["Damascus",33.51,36.29,"e",0,"damascus"],["Shechem",32.21,35.28,"e",0,"shechem"],["Bethel",31.93,35.22,"w",0,"bethel"],["Hebron",31.53,35.1,"e",0,"hebron"],["Egypt",30.7,31.4,"s",0,"egypt"]],scale:200},
  notes:{ur:["Ur","Abram's hometown, a wealthy city of the Chaldeans devoted to the moon god. Archaeologists have found its temple tower (a ziggurat) and royal tombs full of gold.",[["Genesis 11:27–31","GEN",11]]],
    harran:["Harran","The family stopped here and Terah died. Here God said: 'Go from your country… to the land I will show you. I will make you into a great nation… all peoples on earth will be blessed through you.' Abram was 75.",[["Genesis 12:1–4","GEN",12]]],
    damascus:["Damascus","One of the oldest continuously lived-in cities on earth. Abram's chief servant Eliezer came from here.",[["Genesis 15:2","GEN",15]]],
    shechem:["Shechem","Abram's first stop in Canaan. God promised the land to his offspring and Abram built an altar.",[["Genesis 12:6–7","GEN",12]]],
    bethel:["Bethel","Abram pitched his tent between Bethel and Ai and 'called on the name of the LORD'. Later Jacob dreamed of the stairway to heaven here.",[["Genesis 12:8","GEN",12],["Genesis 28","GEN",28]]],
    hebron:["Hebron","Abraham's home base, by the great trees of Mamre. He bought the cave of Machpelah here to bury Sarah, the only land he ever owned.",[["Genesis 13:18","GEN",13],["Genesis 23","GEN",23]]],
    egypt:["Egypt","A famine drove Abram south, where he passed Sarai off as his sister. A preview of the later story: famine, Egypt, plagues on Pharaoh, and leaving with wealth.",[["Genesis 12:10–20","GEN",12]]]}},
family:{t:"Abraham's family",k:"Family tree · Genesis 11–50",ref:[["Genesis 25","GEN",25]],
  sum:"Four generations from Terah to the twelve tribes of Israel. Tap anyone to see who they are.",tree:1},
exodus:{t:"The way out of Egypt",k:"Map · Exodus 12–19",ref:[["Exodus 14","EXO",14]],
  sum:"The traditional route from slavery in Egypt to Mount Sinai, and on to the edge of the promised land. Scholars still debate the exact path.",
  map:{id:"exodus",rivers:["nile","rosetta","damietta","jordan"],
    waters:[["Mediterranean Sea",31.95,32.6],["Red Sea",27.55,34.75],["Gulf of Suez",28.45,32.85,"middle",-56],["Gulf of Aqaba",28.75,34.62,"middle",-75]],
    regions:[["GOSHEN",30.95,31.1],["EGYPT",28.3,30.5],["SINAI",29.75,33.55],["EDOM",30.4,35.75],["MOAB",31.45,36.15],["CANAAN",31.45,34.75]],
    routes:[{c:"c2",l:"Egypt to Sinai",pts:[[30.8,31.83],[30.55,32.1],[30.33,32.38],[29.95,32.6],[29.55,32.78],[29.3,33.0],[28.95,33.15],[28.72,33.62],[28.54,33.97]]},
            {c:"c3",l:"40 years to the Jordan",dash:1,pts:[[28.54,33.97],[29.2,34.55],[30.69,34.49],[29.9,35.0],[29.6,35.05],[30.0,35.75],[30.9,35.95],[31.77,35.73],[31.87,35.44]]}],
    stops:[["Rameses",30.8,31.83,"w",1,"rameses"],["Succoth",30.55,32.1,"e",0,"succoth"],["Sea crossing?",30.33,32.38,"e",0,"sea"],["Marah",29.55,32.78,"w",0,"marah"],["Elim",29.3,33.0,"e",0,"elim"],["Rephidim",28.72,33.62,"w",0,"rephidim"],["Mount Sinai",28.54,33.97,"e",1,"sinai"],["Kadesh",30.69,34.49,"w",0,"kadesh"],["Mount Nebo",31.77,35.73,"e",0,"nebo"],["Jericho",31.87,35.44,"w",0,"jericho"]],scale:100},
  notes:{rameses:["Rameses","A store city the Hebrew slaves were forced to build, in the fertile Nile delta region called Goshen. The march began here the night after the first Passover.",[["Exodus 1:11","EXO",1],["Exodus 12:37","EXO",12]]],
    succoth:["Succoth","First camp. God led them by a pillar of cloud by day and fire by night, and deliberately not along the short coastal road past Philistine forts.",[["Exodus 13:17–22","EXO",13]]],
    sea:["The sea crossing","The Hebrew says 'Yam Suph', the Sea of Reeds. Proposed locations include the Bitter Lakes, the Gulf of Suez and the Gulf of Aqaba. The point of the story is clear wherever it was: God made a way where there was none.",[["Exodus 14","EXO",14],["Exodus 15","EXO",15]]],
    marah:["Marah","Three days without water, then water too bitter to drink. God showed Moses a piece of wood that made it sweet.",[["Exodus 15:22–26","EXO",15]]],
    elim:["Elim","An oasis with twelve springs and seventy palm trees.",[["Exodus 15:27","EXO",15]]],
    rephidim:["Rephidim","Water from the rock, and the battle with Amalek won while Aaron and Hur held up Moses' arms.",[["Exodus 17","EXO",17]]],
    sinai:["Mount Sinai","The traditional site is Jebel Musa (2,285 m). Israel camped here for about a year. God gave the Ten Commandments and made his covenant with the nation.",[["Exodus 19","EXO",19],["Exodus 20","EXO",20]]],
    kadesh:["Kadesh Barnea","The spies were sent from here. The people refused to enter the land, so that generation wandered for 40 years.",[["Numbers 13–14",null,0]]],
    nebo:["Mount Nebo","Moses saw the whole promised land from this peak, then died. He never went in.",[["Deuteronomy 34",null,0]]],
    jericho:["Jericho","The first city Israel took after crossing the Jordan under Joshua. One of the oldest cities in the world.",[["Joshua 6",null,0]]]}},
tabernacle:{t:"The Tabernacle",k:"Diagram · Exodus 25–40",ref:[["Exodus 25",null,0]],
  sum:"God's portable home among his people, drawn to scale in cubits (1 cubit ≈ 45 cm). Every piece pointed forward to Jesus. Tap an item.",tab:1},
paul:{t:"Paul's journeys",k:"Map · Acts 13–28",ref:[["Acts 13","ACT",13]],
  sum:"Three mission trips and a voyage to Rome as a prisoner. Paul covered roughly 16,000 km by foot and ship. Tap a journey to follow it.",
  map:{id:"paul",rivers:[],
    waters:[["Mediterranean Sea",33.6,20.5],["Aegean Sea",39.0,25.15,"middle"],["Black Sea",42.25,33.0],["Adriatic",42.25,16.2]],
    regions:[["GALATIA",39.0,33.0],["ASIA",38.85,28.9],["MACEDONIA",41.35,22.3],["ACHAIA",37.35,22.1],["SYRIA",35.0,37.3],["ITALY",40.55,16.35],["CYPRUS",35.05,33.35],["CRETE",35.2,24.9]],
    routes:[
      {c:"c1",l:"1st journey",r:"Acts 13–14",pts:[[36.2,36.16],[36.12,35.93],[35.18,33.9],[34.76,32.41],[36.0,31.6],[36.89,30.7],[36.96,30.85],[38.31,31.19],[37.87,32.49],[37.58,32.45],[37.35,33.37],[37.58,32.45],[37.87,32.49],[38.31,31.19],[36.96,30.85],[36.89,30.7],[36.0,32.0],[35.95,34.6],[36.12,35.93],[36.2,36.16]]},
      {c:"c3",l:"2nd journey",r:"Acts 15–18",pts:[[36.2,36.16],[37.0,36.6],[36.92,34.89],[37.35,33.37],[37.58,32.45],[37.87,32.49],[38.31,31.19],[39.1,29.6],[39.75,26.16],[40.3,25.2],[40.94,24.41],[41.01,24.29],[40.82,23.85],[40.64,22.94],[40.52,22.2],[40.39,22.6],[40.0,23.0],[39.4,23.8],[38.6,24.4],[37.55,24.05],[37.94,23.73],[37.91,22.88],[37.88,22.99],[37.7,24.3],[37.4,25.6],[37.55,27.05],[37.94,27.34],[37.55,27.05],[36.3,26.9],[35.5,28.0],[32.5,34.89],[31.78,35.23],[36.2,36.16]]},
      {c:"c4",l:"3rd journey",r:"Acts 18–21",pts:[[36.2,36.16],[37.0,36.6],[36.92,34.89],[37.35,33.37],[37.58,32.45],[37.87,32.49],[38.31,31.19],[38.4,29.0],[37.94,27.34],[38.7,27.5],[39.75,26.16],[40.3,25.2],[41.01,24.29],[40.64,22.94],[40.52,22.2],[37.91,22.88],[40.52,22.2],[40.64,22.94],[41.01,24.29],[40.94,24.41],[40.3,25.2],[39.75,26.16],[39.49,26.34],[39.1,26.55],[38.6,26.25],[37.55,27.05],[37.53,27.28],[36.89,27.29],[36.55,27.6],[36.43,28.22],[36.26,29.32],[34.3,32.0],[33.27,35.2],[32.92,35.07],[32.5,34.89],[31.78,35.23]]},
      {c:"c2",l:"To Rome",r:"Acts 27–28",pts:[[32.5,34.89],[33.56,35.37],[35.0,35.25],[35.95,34.8],[35.85,33.0],[36.1,31.0],[36.23,29.97],[36.3,28.6],[36.68,27.37],[35.45,26.4],[34.85,25.5],[34.93,24.81],[34.8,24.0],[35.2,20.0],[35.9,14.4],[37.07,15.29],[38.11,15.65],[40.82,14.12],[41.3,13.4],[41.89,12.49]]}],
    stops:[["Antioch",36.2,36.16,"e",1,"antioch"],["Tarsus",36.92,34.89,"n",0,"tarsus"],["Damascus",33.51,36.29,"e",0,"damascus"],["Jerusalem",31.78,35.23,"e",1,"jerusalem"],["Caesarea",32.5,34.89,"w",0,"caesarea"],["Salamis",35.18,33.9,"s",0,"cyprus"],["Paphos",34.76,32.41,"s",0,"paphos"],["Perga",36.96,30.85,"s",0,"perga"],["Pisidian Antioch",38.31,31.19,"n",0,"pantioch"],["Iconium",37.87,32.49,"n",0,"iconium"],["Lystra",37.58,32.45,"w",0,"lystra"],["Derbe",37.35,33.37,"e",0,"derbe"],["Troas",39.75,26.16,"w",0,"troas"],["Philippi",41.01,24.29,"n",0,"philippi"],["Thessalonica",40.64,22.94,"n",0,"thess"],["Berea",40.52,22.2,"w",0,"berea"],["Athens",37.94,23.73,"e",0,"athens"],["Corinth",37.91,22.88,"w",1,"corinth"],["Ephesus",37.94,27.34,"e",1,"ephesus"],["Miletus",37.53,27.28,"e",0,"miletus"],["Fair Havens",34.93,24.81,"s",0,"crete"],["Malta",35.9,14.4,"s",0,"malta"],["Syracuse",37.07,15.29,"e",0,"syracuse"],["Puteoli",40.82,14.12,"e",0,"puteoli"],["Rome",41.89,12.49,"n",1,"rome"]],scale:400},
  notes:{antioch:["Antioch in Syria","The third-largest city in the Roman Empire and Paul's home church. Followers of Jesus were first called 'Christians' here. Every journey started here.",[["Acts 11:19–26","ACT",11],["Acts 13:1–3","ACT",13]]],
    tarsus:["Tarsus","Paul's hometown, 'no ordinary city', famous for its university. Paul was born a Roman citizen here.",[["Acts 21:39","ACT",21],["Acts 22:3","ACT",22]]],
    damascus:["Damascus","On the road here Saul, hunting Christians, met the risen Jesus in a blinding light. Everything changed.",[["Acts 9","ACT",9]]],
    jerusalem:["Jerusalem","Where the church began at Pentecost. Paul returned here after each journey and was arrested in the temple at the end of the third.",[["Acts 2","ACT",2],["Acts 15","ACT",15],["Acts 21","ACT",21]]],
    caesarea:["Caesarea","A gleaming Roman port built by Herod the Great. Paul was held prisoner here for two years before appealing to Caesar.",[["Acts 23–26","ACT",23]]],
    cyprus:["Salamis, Cyprus","First stop of the first journey. Cyprus was Barnabas's home island.",[["Acts 13:4–5","ACT",13]]],
    paphos:["Paphos","The Roman governor Sergius Paulus believed here. From this point Saul is called by his Roman name, Paul.",[["Acts 13:6–12","ACT",13]]],
    perga:["Perga","John Mark left the team here and went home, which later caused a sharp split between Paul and Barnabas.",[["Acts 13:13","ACT",13],["Acts 15:37–40","ACT",15]]],
    pantioch:["Pisidian Antioch","Paul's longest recorded sermon in a synagogue. Almost the whole city came to hear him the next Sabbath.",[["Acts 13:14–52","ACT",13]]],
    iconium:["Iconium","A city split in two over the message. A plot to stone them forced them to flee.",[["Acts 14:1–7","ACT",14]]],
    lystra:["Lystra","After a healing, the crowd called Barnabas 'Zeus' and Paul 'Hermes'. Then Paul was stoned and left for dead. Timothy came from here.",[["Acts 14:8–20","ACT",14],["Acts 16:1","ACT",16]]],
    derbe:["Derbe","The furthest point of the first journey. Many became disciples.",[["Acts 14:20–21","ACT",14]]],
    troas:["Troas","Paul saw a vision of a man saying 'Come over to Macedonia and help us.' The gospel crossed into Europe. On a later visit Eutychus fell asleep during Paul's long talk and fell from a window.",[["Acts 16:8–10","ACT",16],["Acts 20:7–12","ACT",20]]],
    philippi:["Philippi","Lydia believed by a river. Paul and Silas were beaten and jailed, sang hymns at midnight, and an earthquake opened the doors.",[["Acts 16","ACT",16]]],
    thess:["Thessalonica","A riot forced Paul out after three weeks, but a lasting church formed. He later wrote 1 and 2 Thessalonians to it.",[["Acts 17:1–9","ACT",17]]],
    berea:["Berea","The Bereans 'examined the Scriptures every day to see if these things were so.' A model for reading the Bible well.",[["Acts 17:10–15","ACT",17]]],
    athens:["Athens","Paul spoke to philosophers on Mars Hill, starting from an altar 'to an unknown god'.",[["Acts 17:16–34","ACT",17]]],
    corinth:["Corinth","Paul stayed 18 months, making tents with Priscilla and Aquila. He wrote Romans from here around AD 57.",[["Acts 18:1–18","ACT",18]]],
    ephesus:["Ephesus","Paul's longest stay, about three years. Burned magic books worth 50,000 silver coins, and a riot in the theatre over the goddess Artemis.",[["Acts 19","ACT",19]]],
    miletus:["Miletus","Paul's tearful goodbye to the Ephesian elders. 'It is more blessed to give than to receive.'",[["Acts 20:17–38","ACT",20]]],
    crete:["Fair Havens, Crete","Paul warned them not to sail on. They did, and a hurricane-force wind called the Northeaster drove the ship for two weeks.",[["Acts 27:8–20","ACT",27]]],
    malta:["Malta","Shipwrecked, all 276 people on board survived. Paul shook off a viper and healed the island chief's father.",[["Acts 27:39–28:10","ACT",28]]],
    syracuse:["Syracuse","Three days in Sicily's great harbour on the way north.",[["Acts 28:12","ACT",28]]],
    puteoli:["Puteoli","The main port for Rome. Believers here welcomed Paul for a week.",[["Acts 28:13–14","ACT",28]]],
    rome:["Rome","Capital of the empire. Paul lived two years under house arrest, welcoming everyone and preaching 'without hindrance'. That is where Acts ends.",[["Acts 28:16–31","ACT",28],["Romans 1","ROM",1]]]}},
timeline:{t:"The Bible on one line",k:"Timeline · to scale",ref:[],sum:"Two thousand years of story, drawn to scale, with a zoom on the time of Jesus and the first church. Dates are approximate.",tl:1},
library:{t:"66 books at a glance",k:"The library · to scale",ref:[],sum:"Each spine is as thick as the book is long, in chapters. The books in your plan have a flame on top. Tap any spine.",lib:1}
};

/* ---- Map renderer ---- */
function figMap(f){
  const s=f.map,m=GEO&&GEO[s.id];
  if(!m) return `<div class="fig-wait">Loading map…</div>`;
  const P=(a,b)=>GPx(m,a,b),pts=a=>a.map(([x,y])=>P(x,y).join(",")).join(" ");
  const kmPx=s.scale/111*m.k;const [sx,sy]=[18,m.h-22];
  return `<svg class="fig gmap" viewBox="0 0 ${m.w} ${m.h}" role="img" aria-label="${esc(f.t)} map">
  <rect width="${m.w}" height="${m.h}" class="g-sea"/>
  <path d="${m.land}" class="g-land"/>
  ${s.rivers.map(r=>`<polyline points="${pts(RIVERS[r])}" class="g-river"/>`).join("")}
  ${LAKES.map(l=>`<polygon points="${pts(l)}" class="g-lake"/>`).join("")}
  ${s.waters.map(([n,a,b,an,rot])=>{const [x,y]=P(a,b);return `<text x="${x}" y="${y}" class="g-water" text-anchor="${an||"middle"}" ${rot?`transform="rotate(${rot} ${x} ${y})"`:""}>${n}</text>`}).join("")}
  ${s.regions.map(([n,a,b])=>{const [x,y]=P(a,b);return `<text x="${x}" y="${y}" class="g-region" text-anchor="middle">${n}</text>`}).join("")}
  ${s.routes.map((r,i)=>`<g class="g-route ${r.c}" data-route="${i}"><polyline points="${pts(r.pts)}" ${r.dash?"":`pathLength="1"`} class="g-line ${r.dash?"dash":""}" style="--d:${.25+i*.35}s"/></g>`).join("")}
  ${s.stops.map(([n,a,b,an,big,key],i)=>{const [x,y]=P(a,b);const o={e:[9,4,"start"],w:[-9,4,"end"],n:[0,-10,"middle"],s:[0,17,"middle"]}[an];
    return `<g class="g-stop ${big?"big":""}" data-note="${key}" tabindex="0" role="button" aria-label="${esc(n)}" style="--d:${.5+i*.06}s"><circle cx="${x}" cy="${y}" r="13" fill="transparent"/><circle cx="${x}" cy="${y}" r="${big?5:3.6}" class="g-dot"/><text x="${x+o[0]}" y="${y+o[1]}" text-anchor="${o[2]}">${esc(n)}</text></g>`}).join("")}
  <g class="g-scale"><line x1="${sx}" y1="${sy}" x2="${(sx+kmPx).toFixed(1)}" y2="${sy}"/><line x1="${sx}" y1="${sy-4}" x2="${sx}" y2="${sy+4}"/><line x1="${(sx+kmPx).toFixed(1)}" y1="${sy-4}" x2="${(sx+kmPx).toFixed(1)}" y2="${sy+4}"/><text x="${sx}" y="${sy-8}">${s.scale} km</text></g>
  <g class="g-north" transform="translate(${m.w-22} 26)"><path d="M0,-12 L5,4 L0,1 L-5,4 Z"/><text y="16" text-anchor="middle">N</text></g>
  </svg>`;
}

/* ---- Family tree ---- */
const FAM={
 nodes:[
  ["terah",500,40,"Terah","father of Abram","Lived in Ur, then set out for Canaan but stopped in Harran and died there.",[["Genesis 11:26–32","GEN",11]]],
  ["haran",170,150,"Haran","died young in Ur","Abram's brother, who died before the family left Ur. His son Lot went with Abram.",[["Genesis 11:28","GEN",11]]],
  ["abraham",500,150,"Abraham","wives Sarah and Hagar","Called by God at 75 and promised a land, a nation and a blessing for the whole world. Renamed from Abram ('exalted father') to Abraham ('father of many').",[["Genesis 12","GEN",12],["Genesis 17","GEN",17]]],
  ["nahor",830,150,"Nahor","stayed in Harran","Abram's brother. His family stayed behind in the region of Harran, where Abraham later sent for a wife for Isaac.",[["Genesis 22:20–23","GEN",22]]],
  ["lot",170,265,"Lot","Abram's nephew","Chose the well-watered plain near Sodom. Rescued twice, once by Abram and once by angels before Sodom's destruction.",[["Genesis 13","GEN",13],["Genesis 19","GEN",19]]],
  ["ishmael",350,265,"Ishmael","son of Hagar","'God hears.' Sent away with his mother, but God promised to make him a great nation too. Father of twelve tribal princes of Arabia.",[["Genesis 16","GEN",16],["Genesis 21:8–21","GEN",21]]],
  ["isaac",560,265,"Isaac","son of Sarah","'He laughs.' The promised son, born when Abraham was 100. Nearly sacrificed on Mount Moriah, where God provided a ram instead.",[["Genesis 21:1–7","GEN",21],["Genesis 22","GEN",22]]],
  ["bethuel",830,265,"Bethuel","son of Nahor","Father of Rebekah and Laban.",[["Genesis 24:15","GEN",24]]],
  ["moab",170,385,"Moab & Ammon","sons of Lot","Ancestors of two nations east of the Jordan. Ruth, David's great-grandmother, was a Moabite.",[["Genesis 19:36–38","GEN",19]]],
  ["esau",410,385,"Esau","also called Edom","Isaac's firstborn twin, who sold his birthright for a bowl of stew. Ancestor of the Edomites.",[["Genesis 25:19–34","GEN",25],["Genesis 36","GEN",36]]],
  ["jacob",600,385,"Jacob","renamed Israel","The younger twin who grabbed his brother's heel and later his blessing. Wrestled with God and was renamed Israel. His twelve sons became the twelve tribes.",[["Genesis 27","GEN",27],["Genesis 32:22–32","GEN",32]]],
  ["rebekah",790,385,"Rebekah","wife of Isaac","Found at a well by Abraham's servant, who prayed for a sign. Mother of Esau and Jacob.",[["Genesis 24","GEN",24]]],
  ["laban",930,385,"Laban","Rebekah's brother","Jacob's uncle, who tricked him into marrying Leah before Rachel. The trickster got tricked.",[["Genesis 29","GEN",29]]]],
 groups:[
  ["leah",180,520,300,"Leah's children","Reuben · Simeon · Levi · Judah\nIssachar · Zebulun · Dinah","Leah was Laban's elder daughter and the less loved wife, yet both the priestly line (Levi) and the royal line (Judah) came through her.",[["Genesis 29:31–35","GEN",29],["Genesis 30","GEN",30]]],
  ["zilpah",405,520,130,"Zilpah's","Gad · Asher","Leah's servant, given to Jacob as a wife.",[["Genesis 30:9–13","GEN",30]]],
  ["bilhah",565,520,150,"Bilhah's","Dan · Naphtali","Rachel's servant, given to Jacob as a wife.",[["Genesis 30:1–8","GEN",30]]],
  ["rachel",770,520,220,"Rachel's children","Joseph · Benjamin","Jacob's great love, for whom he worked 14 years. She died giving birth to Benjamin.",[["Genesis 29:16–30","GEN",29],["Genesis 35:16–20","GEN",35]]]],
 leaves:[
  ["levi",110,650,"Moses & Aaron","from Levi","The tribe of Levi became Israel's priests. Moses and Aaron were Levites.",[["Exodus 2","EXO",2]]],
  ["judah",300,650,"King David → Jesus","from Judah","Jacob blessed Judah: 'The sceptre will not depart from Judah.' David came from Judah, and Matthew traces Jesus' family line back through him to Abraham.",[["Genesis 49:8–10","GEN",49],["Matthew 1:1–17",null,0]]],
  ["joseph",770,650,"Ephraim & Manasseh","Joseph's sons","Joseph was sold by his brothers, rose to rule Egypt and saved the family in a famine. His two sons each became a tribe.",[["Genesis 37","GEN",37],["Genesis 50:20","GEN",50]]]],
 edges:[["terah","haran"],["terah","abraham"],["terah","nahor"],["haran","lot"],["abraham","ishmael"],["abraham","isaac"],["nahor","bethuel"],["lot","moab"],["isaac","esau"],["isaac","jacob"],["bethuel","rebekah"],["bethuel","laban"],["jacob","leah"],["jacob","zilpah"],["jacob","bilhah"],["jacob","rachel"],["leah","levi"],["leah","judah"],["rachel","joseph"]],
 marry:[["isaac","rebekah"]]
};
function famPos(id){for(const n of FAM.nodes)if(n[0]===id)return {x:n[1],y:n[2],h:54};for(const g of FAM.groups)if(g[0]===id)return {x:g[1],y:g[2],h:70};for(const l of FAM.leaves)if(l[0]===id)return {x:l[1],y:l[2],h:54}}
function figTree(){
  const e=FAM.edges.map(([a,b],i)=>{const p=famPos(a),q=famPos(b);const y1=p.y+p.h/2,y2=q.y-q.h/2,my=(y1+y2)/2;return `<path d="M${p.x},${y1} V${my} H${q.x} V${y2}" class="t-edge" pathLength="1" style="--d:${.15+i*.04}s"/>`}).join("");
  const mr=FAM.marry.map(([a,b])=>{const p=famPos(a),q=famPos(b);return `<path d="M${p.x+65},${p.y} C${q.x-40},${p.y} ${q.x},${p.y+20} ${q.x},${q.y-27}" class="t-marry"/><text x="${(p.x+q.x)/2+40}" y="${p.y-6}" class="t-lbl">married</text>`}).join("");
  const box=(id,x,y,w,h,n,sub,i,cls="")=>`<g class="t-node ${cls}" data-note="${id}" tabindex="0" role="button" aria-label="${esc(n)}" style="--d:${.1+i*.05}s"><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="12"/><text x="${x}" y="${y-(sub.includes("\n")?12:3)}" class="t-name">${esc(n)}</text>${sub.split("\n").map((s,j)=>`<text x="${x}" y="${y+(sub.includes("\n")?8:15)+j*15}" class="t-sub">${esc(s)}</text>`).join("")}</g>`;
  let i=0;
  return `<svg class="fig tree" viewBox="0 0 1000 690" role="img" aria-label="Family tree of Abraham">
   <text x="20" y="28" class="t-gen">Generation 1</text>
   ${e}${mr}
   ${FAM.nodes.map(n=>box(n[0],n[1],n[2],130,54,n[3],n[4],i++,n[0]==="abraham"||n[0]==="jacob"?"key":"")).join("")}
   ${FAM.groups.map(g=>box(g[0],g[1],g[2],g[3],70,g[4],g[5],i++,"grp")).join("")}
   ${FAM.leaves.map(l=>box(l[0],l[1],l[2],170,54,l[3],l[4],i++,"leaf")).join("")}
   <text x="20" y="595" class="t-gen">The twelve tribes of Israel</text>
  </svg>`;
}
const famNotes=()=>{const o={};FAM.nodes.forEach(n=>o[n[0]]=[n[3],n[5],n[6]]);FAM.groups.forEach(g=>o[g[0]]=[g[4],g[6],g[7]]);FAM.leaves.forEach(l=>o[l[0]]=[l[3],l[5],l[6]]);return o};

/* ---- Tabernacle (1 cubit = 6 units; north up, entrance east) ---- */
const TAB=[
 ["gate","The gate","Only one way in, 20 cubits wide, with a curtain of blue, purple and scarlet yarn. Jesus: 'I am the gate. Whoever enters through me will be saved.'",[["Exodus 27:16",null,0],["John 10:9","JHN",10]]],
 ["altar","Bronze altar","5 × 5 cubits and 3 high, covered in bronze. Animals were sacrificed here to cover sin. Hebrews says Jesus offered himself 'once for all'.",[["Exodus 27:1–8",null,0],["Hebrews 10:10–14",null,0]]],
 ["basin","Bronze basin","Priests washed their hands and feet here before serving. It was made from the bronze mirrors of the women who served at the entrance.",[["Exodus 30:17–21",null,0],["Exodus 38:8",null,0]]],
 ["holy","The Holy Place","20 × 10 cubits. Only priests entered, every day, to tend the lamp, the bread and the incense.",[["Exodus 26:33",null,0]]],
 ["table","Table and the bread","A gold-covered table with twelve loaves, one for each tribe, renewed every Sabbath. Jesus: 'I am the bread of life.'",[["Exodus 25:23–30",null,0],["John 6:35","JHN",6]]],
 ["lamp","Golden lampstand","Hammered from one piece of pure gold, shaped like an almond tree with seven lamps. It was the only light inside and was never allowed to go out. Jesus: 'I am the light of the world.'",[["Exodus 25:31–40",null,0],["John 8:12","JHN",8]]],
 ["incense","Altar of incense","Fragrant incense burned here morning and evening, a picture of prayers rising to God.",[["Exodus 30:1–10",null,0],["Psalm 141:2",null,0]]],
 ["veil","The curtain","A thick curtain embroidered with cherubim separated people from God's presence. When Jesus died, the temple curtain was torn in two from top to bottom.",[["Exodus 26:31–33",null,0],["Mark 15:38","MRK",15]]],
 ["most","Most Holy Place","A perfect cube, 10 cubits each way. Only the high priest entered, once a year on the Day of Atonement, with blood.",[["Leviticus 16",null,0],["Hebrews 9:11–12",null,0]]],
 ["ark","Ark of the covenant","A gold-covered chest, 2.5 × 1.5 × 1.5 cubits, holding the stone tablets of the law. Its lid, the 'mercy seat', had two gold cherubim. God said: 'There I will meet with you.'",[["Exodus 25:10–22",null,0],["Romans 3:25","ROM",3]]],
 ["court","The courtyard","100 × 50 cubits (about 45 × 23 m), fenced with linen curtains 5 cubits high on 60 posts.",[["Exodus 27:9–19",null,0]]],
 ["camp","The camp around it","The twelve tribes camped in four groups of three around the tabernacle, with God's tent at the centre of their life.",[["Numbers 2",null,0]]]
];
function figTab(){
  const X=c=>60+c*6,Y=c=>70+c*6; // court 0..100 x, 0..50 y
  const it=(id,inner,i)=>`<g class="tb-item" data-note="${id}" tabindex="0" role="button" aria-label="${esc(TAB.find(t=>t[0]===id)[1])}" style="--d:${.3+i*.08}s">${inner}</g>`;
  const lab=(x,y,t,an="middle")=>`<text x="${x}" y="${y}" class="tb-lbl" text-anchor="${an}">${t}</text>`;
  return `<svg class="fig tab" viewBox="0 0 720 470" role="img" aria-label="Plan of the Tabernacle">
   <text x="360" y="22" class="tb-tribe" text-anchor="middle">NORTH · Dan, Asher, Naphtali</text>
   <text x="360" y="458" class="tb-tribe" text-anchor="middle">SOUTH · Reuben, Simeon, Gad</text>
   <text x="24" y="220" class="tb-tribe" text-anchor="middle" transform="rotate(-90 24 220)">WEST · Ephraim, Manasseh, Benjamin</text>
   <text x="700" y="220" class="tb-tribe" text-anchor="middle" transform="rotate(90 700 220)">EAST · Judah, Issachar, Zebulun</text>
   ${it("court",`<rect x="${X(0)}" y="${Y(0)}" width="600" height="300" class="tb-court"/>`,0)}
   <g class="tb-posts">${Array.from({length:21},(_,i)=>`<circle cx="${X(i*5)}" cy="${Y(0)}" r="2"/><circle cx="${X(i*5)}" cy="${Y(50)}" r="2"/>`).join("")}${Array.from({length:9},(_,i)=>`<circle cx="${X(0)}" cy="${Y(5+i*5)}" r="2"/>${i<3||i>5?`<circle cx="${X(100)}" cy="${Y(5+i*5)}" r="2"/>`:""}`).join("")}</g>
   ${it("gate",`<rect x="${X(100)-4}" y="${Y(15)}" width="8" height="120" class="tb-gate"/>`,1)}
   ${it("altar",`<rect x="${X(72.5)-15}" y="${Y(25)-15}" width="30" height="30" rx="2" class="tb-bronze"/><path d="M${X(72.5)-15},${Y(25)-15} l6,-6 M${X(72.5)+15},${Y(25)-15} l6,-6 M${X(72.5)-15},${Y(25)+15} l-6,6 M${X(72.5)+15},${Y(25)+15} l6,6" class="tb-horn"/>`,2)}
   ${it("basin",`<circle cx="${X(58)}" cy="${Y(25)}" r="10" class="tb-bronze"/><circle cx="${X(58)}" cy="${Y(25)}" r="5" class="tb-water"/>`,3)}
   ${it("holy",`<rect x="${X(30)}" y="${Y(20)}" width="120" height="60" class="tb-tent"/>`,4)}
   ${it("most",`<rect x="${X(20)}" y="${Y(20)}" width="60" height="60" class="tb-tent most"/>`,5)}
   ${it("veil",`<rect x="${X(30)-2.5}" y="${Y(20)}" width="5" height="60" class="tb-veil"/>`,6)}
   ${it("ark",`<rect x="${X(25)-7.5}" y="${Y(25)-4.5}" width="15" height="9" class="tb-gold"/><path d="M${X(25)-5},${Y(25)-4.5} q5,-6 10,0" class="tb-cher"/>`,7)}
   ${it("incense",`<rect x="${X(32.5)-3}" y="${Y(25)-3}" width="6" height="6" class="tb-gold"/>`,8)}
   ${it("table",`<rect x="${X(40)-6}" y="${Y(21.5)}" width="12" height="6" class="tb-gold"/>`,9)}
   ${it("lamp",`<g class="tb-menorah"><circle cx="${X(40)}" cy="${Y(27.4)}" r="4.5" class="tb-glow"/><circle cx="${X(40)}" cy="${Y(27.4)}" r="2.6" class="tb-gold"/></g>`,10)}
   ${lab(X(72.5),Y(25)-26,"Bronze altar")}${lab(X(58),Y(25)+24,"Basin")}
   ${lab(X(40),Y(20)-8,"Holy Place")}${lab(X(25),Y(20)-8,"Most Holy")}
   <path d="M${X(40)},${Y(21.5)} L${X(46)},${Y(10)}" class="tb-lead"/>${lab(X(46)+4,Y(10)-3,"Table of bread","start")}
   <path d="M${X(40)},${Y(28.6)} L${X(46)},${Y(40)}" class="tb-lead"/>${lab(X(46)+4,Y(40)+12,"Lampstand","start")}
   <path d="M${X(25)},${Y(25)+5} L${X(16)},${Y(40)}" class="tb-lead"/>${lab(X(16)-2,Y(40)+12,"Ark","end")}
   <path d="M${X(32.5)},${Y(25)+3} L${X(32)},${Y(40)}" class="tb-lead"/>${lab(X(32),Y(40)+12,"Incense","middle")}
   ${lab(X(100)-12,Y(25)+4,"Gate","end")}
   <g class="tb-scale"><line x1="${X(0)}" y1="${Y(50)+18}" x2="${X(10)}" y2="${Y(50)+18}"/><line x1="${X(0)}" y1="${Y(50)+14}" x2="${X(0)}" y2="${Y(50)+22}"/><line x1="${X(10)}" y1="${Y(50)+14}" x2="${X(10)}" y2="${Y(50)+22}"/><text x="${X(10)+6}" y="${Y(50)+22}">10 cubits ≈ 4.5 m</text></g>
   ${it("camp",`<circle cx="${X(100)+30}" cy="${Y(50)+20}" r="9" class="tb-info"/><text x="${X(100)+30}" y="${Y(50)+24}" text-anchor="middle" class="tb-i">i</text>`,11)}
  </svg>`;
}
const tabNotes=()=>Object.fromEntries(TAB.map(t=>[t[0],[t[1],t[2],t[3]]]));

/* ---- Timeline ---- */
const TL={
 eras:[[-2100,-1805,"Patriarchs"],[-1805,-1446,"In Egypt"],[-1446,-1406,""],[-1406,-1050,"Judges"],[-1050,-586,"Kings"],[-586,-538,""],[-538,-430,"Return"],[-430,-6,"Between the Testaments"],[-6,100,"Jesus & church"]],
 main:[[-2000,"Abraham is called","u1","GEN",12,"God calls Abram from Harran and promises a land, a nation and a blessing for all peoples."],[-1880,"Joseph rules Egypt","d1","GEN",41,"Sold as a slave, Joseph rises to second in Egypt and saves his family from famine."],[-1446,"The Exodus","u1","EXO",12,"Israel leaves Egypt after the Passover. Some scholars date it around 1260 BC instead."],[-1406,"Into Canaan","d1",null,0,"Joshua leads Israel across the Jordan into the promised land."],[-1010,"David is king","u1","PSA",23,"David unites the tribes and makes Jerusalem the capital. Many psalms come from his life."],[-966,"Temple built","d1",null,0,"Solomon builds the first temple in Jerusalem, on the same mount where Abraham offered Isaac."],[-930,"Kingdom splits","u2",null,0,"Ten tribes break away as Israel in the north, leaving Judah in the south."],[-722,"Israel falls","d2",null,0,"Assyria destroys the northern kingdom and scatters its people."],[-586,"Jerusalem falls","u1",null,0,"Babylon destroys the temple and takes the people into exile."],[-538,"Return home","u2",null,0,"Persia's King Cyrus lets the exiles go home to rebuild."],[-3,"Jesus","d1","MRK",1,"Jesus is born around 6 to 4 BC. See the zoomed view below."]],
 zoom:[[-5,"Jesus is born","u1","LUK",2,"Born in Bethlehem while Herod the Great is king, around 6 to 4 BC."],[27,"Ministry begins","d1","MRK",1,"Jesus is baptised and begins teaching, about 30 years old."],[30,"Cross & resurrection","u2","MRK",16,"Jesus is crucified and rises again, around AD 30 or 33."],[35,"Paul meets Jesus","d2","ACT",9,"Saul is turned around on the Damascus road."],[47,"1st journey","u1","ACT",13,"Paul and Barnabas take the message to Cyprus and Galatia."],[50,"2nd journey","d1","ACT",16,"The gospel crosses into Europe."],[54,"3rd journey","u2","ACT",19,"Three years in Ephesus."],[57,"Romans written","d2","ROM",1,"Paul writes from Corinth to the believers in Rome."],[61,"Paul in Rome","u1","ACT",28,"Two years under house arrest. Acts ends here."],[70,"Temple destroyed","d1",null,0,"Rome destroys Jerusalem and its temple, as Jesus warned."],[95,"Revelation","u1",null,0,"John's vision of the end of the story: a new heaven and a new earth."]]
};
function figTL(){
  const W=1100,x1=y=>60+(y+2100)*(980/2200),x2=y=>60+(y+6)*(980/106);
  const lane={u1:-38,u2:-76,d1:40,d2:78};
  const ev=(arr,X,base,pre)=>arr.map(([y,t,l,b,c],i)=>{const x=X(y).toFixed(1),dy=lane[l],ty=base+dy+(dy<0?-4:12);
    return `<g class="tl-ev" data-note="${pre}${i}" tabindex="0" role="button" aria-label="${esc(t)}" style="--d:${.2+i*.07}s"><line x1="${x}" y1="${base}" x2="${x}" y2="${base+dy}" class="tl-stem"/><circle cx="${x}" cy="${base}" r="5" class="tl-dot ${b?"inplan":""}"/><text x="${x}" y="${ty}" text-anchor="middle" class="tl-t">${esc(t)}</text><text x="${x}" y="${ty+(dy<0?-15:15)}" text-anchor="middle" class="tl-y">${y<0?`c. ${-y} BC`:`AD ${y}`}</text></g>`}).join("");
  const B=150,Z=455;
  return `<svg class="fig tl" viewBox="0 0 ${W} 580" role="img" aria-label="Timeline of the Bible">
   <text x="60" y="26" class="tl-h">2100 BC to AD 100</text>
   ${TL.eras.map(([a,b,n],i)=>`<g class="tl-era" style="--d:${i*.05}s"><rect x="${x1(a)}" y="${B-9}" width="${(x1(b)-x1(a)).toFixed(1)}" height="18" class="e${i%2}"/>${n&&x1(b)-x1(a)>40?`<text x="${((x1(a)+x1(b))/2).toFixed(1)}" y="${B+4}" text-anchor="middle" class="tl-era-t">${n}</text>`:""}</g>`).join("")}
   ${[-2000,-1500,-1000,-500].map(y=>`<text x="${x1(y)}" y="${B+120}" class="tl-tick" text-anchor="middle">${-y} BC</text><line x1="${x1(y)}" y1="${B+100}" x2="${x1(y)}" y2="${B+106}" class="tl-stem"/>`).join("")}<text x="${x1(0)}" y="${B+120}" class="tl-tick" text-anchor="middle">BC | AD</text>
   ${ev(TL.main,x1,B,"m")}
   <path d="M${x1(-6)},${B+10} L60,${Z-100} M${x1(100)},${B+10} L${W-60},${Z-100}" class="tl-zoomline"/>
   <text x="60" y="${Z-112}" class="tl-h">Zoom: the time of Jesus and the first church</text>
   <rect x="60" y="${Z-9}" width="980" height="18" class="e0"/>
   <rect x="${x2(-6)}" y="${Z-9}" width="${(x2(30)-x2(-6)).toFixed(1)}" height="18" class="tl-bar c1"/><rect x="${x2(46)}" y="${Z-9}" width="${(x2(57)-x2(46)).toFixed(1)}" height="18" class="tl-bar c3"/>
   <text x="${x2(12)}" y="${Z+4}" text-anchor="middle" class="tl-era-t on">Life of Jesus</text><text x="${x2(51.5)}" y="${Z+4}" text-anchor="middle" class="tl-era-t on">Journeys</text>
   ${[0,25,50,75,100].map(y=>`<text x="${x2(y)}" y="${Z+118}" class="tl-tick" text-anchor="middle">${y?`AD ${y}`:"BC | AD"}</text>`).join("")}
   ${ev(TL.zoom,x2,Z,"z")}
  </svg>`;
}
const tlNotes=()=>{const o={};TL.main.forEach((e,i)=>o["m"+i]=[e[1],e[5],e[3]?[[e[3]==="PSA"?"Psalm 23":`${BOOKS[e[3]].name} ${e[4]}`,e[3],e[4]]]:[]]);TL.zoom.forEach((e,i)=>o["z"+i]=[e[1],e[5],e[3]?[[`${BOOKS[e[3]].name} ${e[4]}`,e[3],e[4]]]:[]]);return o};

/* ---- Library ---- */
const LIB=[
 ["Genesis",50,0,"GEN"],["Exodus",40,0,"EXO"],["Leviticus",27,0],["Numbers",36,0],["Deuteronomy",34,0],["Joshua",24,0],["Judges",21,0],["Ruth",4,0],["1 Samuel",31,0],["2 Samuel",24,0],["1 Kings",22,0],["2 Kings",25,0],["1 Chronicles",29,0],["2 Chronicles",36,0],["Ezra",10,0],["Nehemiah",13,0],["Esther",10,0],
 ["Job",42,1],["Psalms",150,1,"PSA"],["Proverbs",31,1],["Ecclesiastes",12,1],["Song of Songs",8,1],
 ["Isaiah",66,2],["Jeremiah",52,2],["Lamentations",5,2],["Ezekiel",48,2],["Daniel",12,2],["Hosea",14,2],["Joel",3,2],["Amos",9,2],["Obadiah",1,2],["Jonah",4,2],["Micah",7,2],["Nahum",3,2],["Habakkuk",3,2],["Zephaniah",3,2],["Haggai",2,2],["Zechariah",14,2],["Malachi",4,2],
 ["Matthew",28,0],["Mark",16,0,"MRK"],["Luke",24,0,"LUK"],["John",21,0,"JHN"],["Acts",28,0,"ACT"],
 ["Romans",16,3,"ROM"],["1 Corinthians",16,3],["2 Corinthians",13,3],["Galatians",6,3],["Ephesians",6,3],["Philippians",4,3],["Colossians",4,3],["1 Thessalonians",5,3],["2 Thessalonians",3,3],["1 Timothy",6,3],["2 Timothy",4,3],["Titus",3,3],["Philemon",1,3],["Hebrews",13,3],["James",5,3],["1 Peter",5,3],["2 Peter",3,3],["1 John",5,3],["2 John",1,3],["3 John",1,3],["Jude",1,3],["Revelation",22,2]];
const LIBCAT=["Story & law","Poetry & wisdom","Prophets & visions","Letters"];
function figLib(){
  const sc=.8,gap=1.2;let out="",x=20,shelf=0,i=0;
  const tops=[40,250];
  LIB.forEach((b,k)=>{
    if(k===39){x=20;shelf=1}
    const w=4+b[1]*sc,h=118+((b[0].length*7)%5)*7,y0=tops[shelf]+150-h;
    const lbl=w>=11?`<text x="${(x+w/2).toFixed(1)}" y="${(y0+h-8).toFixed(1)}" transform="rotate(-90 ${(x+w/2).toFixed(1)} ${(y0+h-8).toFixed(1)})" class="lb-t" dy="3.5">${esc(b[0])}</text>`:"";
    out+=`<g class="lb-b k${b[2]}" data-note="b${k}" tabindex="0" role="button" aria-label="${esc(b[0])}, ${b[1]} chapters" style="--d:${(k*.012).toFixed(3)}s"><rect x="${x.toFixed(1)}" y="${y0}" width="${w.toFixed(1)}" height="${h}" rx="1.5"/>${lbl}${b[3]?`<circle cx="${(x+w/2).toFixed(1)}" cy="${y0-8}" r="3.4" class="lb-flame"/>`:""}</g>`;
    x+=w+gap;
  });
  return `<svg class="fig lib" viewBox="0 0 1000 470" role="img" aria-label="The 66 books of the Bible">
   <text x="20" y="28" class="tl-h">Old Testament · 39 books · 929 chapters</text>
   <text x="20" y="238" class="tl-h">New Testament · 27 books · 260 chapters</text>
   ${out}
   <rect x="14" y="190" width="972" height="6" rx="2" class="lb-shelf"/><rect x="14" y="400" width="972" height="6" rx="2" class="lb-shelf"/>
   <g transform="translate(440 296)">${LIBCAT.map((c,i)=>`<g transform="translate(${(i%2)*210} ${Math.floor(i/2)*26})"><rect width="14" height="14" rx="3" class="lb-key k${i}"/><text x="22" y="11.5" class="lb-kt">${c}</text></g>`).join("")}<g transform="translate(0 56)"><circle cx="7" cy="7" r="4" class="lb-flame"/><text x="22" y="11.5" class="lb-kt">In your reading plan</text></g></g>
  </svg>`;
}
const libNotes=()=>Object.fromEntries(LIB.map((b,k)=>[`b${k}`,[b[0],`${b[1]} chapter${b[1]>1?"s":""} · ${LIBCAT[b[2]]}${k>=39?" · New Testament":" · Old Testament"}.${b[3]?" It's in your reading plan.":""}`,b[3]?[[`${b[0]} ${b[3]==="PSA"?23:1}`,b[3],b[3]==="PSA"?23:(b[3]==="GEN"?1:1)]]:[]]]));

function figSVG(id){const f=FIGS[id];return f.map?figMap(f):f.tree?figTree():f.tab?figTab():f.tl?figTL():figLib()}
function figNotes(id){const f=FIGS[id];return f.notes||(f.tree?famNotes():f.tab?tabNotes():f.tl?tlNotes():libNotes())}
const FIG_ORDER=["abraham","family","exodus","tabernacle","paul","timeline","library"];
function figsFor(p){const b=p.book,c=p.ch,o=[];
  if(b==="GEN"){if(c>=11&&c<=25)o.push("abraham");if(c>=11)o.push("family");if(c<11)o.push("timeline")}
  if(b==="EXO")o.push("exodus","tabernacle");
  if(b==="ACT"||b==="ROM")o.push("paul");
  if(b==="MRK"&&c>=14||b==="LUK"&&c>=22)o.push("tabernacle");
  if(["MRK","LUK","JHN","PSA"].includes(b))o.push("timeline");
  o.push("library");return [...new Set(o)].slice(0,3)}
function figCard(id,small){const f=FIGS[id];return `<button class="figcard ${small?"sm":""}" data-fig="${id}"><div class="figthumb" data-figthumb="${id}">${figSVG(id)}</div><div class="figmeta"><span class="kicker">${f.k}</span><b>${f.t}</b></div></button>`}
function refreshThumbs(){document.querySelectorAll("[data-figthumb]").forEach(el=>{const id=el.dataset.figthumb;if(FIGS[id].map)el.innerHTML=figSVG(id)})}

/* ---- Viewer with pan and pinch zoom ---- */
let figCur=null;
function openFig(id,focus){
  const f=FIGS[id];figCur=id;
  const nav=FIG_ORDER.indexOf(id);
  const legend=f.map&&f.map.routes.length>1?`<div class="fig-legend" role="group" aria-label="Routes">${f.map.routes.map((r,i)=>`<button data-rt="${i}" aria-pressed="false"><i class="sw ${r.c} ${r.dash?"dash":""}"></i>${r.l}${r.r?` <span>${r.r}</span>`:""}</button>`).join("")}</div>`:"";
  $("#layer").insertAdjacentHTML("beforeend",`<div class="figv" role="dialog" aria-modal="true" aria-label="${esc(f.t)}">
   <header class="figv-h"><div><div class="kicker">${f.k}</div><h2>${f.t}</h2></div>
    <div class="figv-btns"><button class="iconbtn" id="fgPrev" aria-label="Previous diagram">${I.chev}</button><button class="iconbtn" id="fgNext" aria-label="Next diagram">${I.chev}</button><button class="iconbtn" id="fgClose" aria-label="Close">${I.close}</button></div></header>
   <p class="figv-sum">${f.sum}</p>
   ${legend}
   <div class="figv-stage" id="fgStage"><div class="pz" id="fgPz">${figSVG(id)}</div>
    <div class="zoomctl"><button id="zIn" aria-label="Zoom in">+</button><button id="zOut" aria-label="Zoom out">−</button><button id="zFit" aria-label="Reset zoom">⤢</button></div></div>
   <div class="figv-note" id="fgNote" aria-live="polite"><p class="muted">Tap any ${f.map?"place":f.lib?"book":f.tl?"event":"item"} to learn more. Pinch or use + and − to zoom.</p></div>
  </div>`);
  document.body.style.overflow="hidden";
  const v=$(".figv");if(!reduced())v.animate([{opacity:0,transform:"translateY(24px) scale(.98)"},{opacity:1,transform:"none"}],{duration:420,easing:"cubic-bezier(.16,1,.3,1)"});
  requestAnimationFrame(()=>v.classList.add("play"));
  const notes=figNotes(id);
  const show=k=>{const n=notes[k];if(!n)return;document.querySelectorAll(".figv [data-note]").forEach(g=>g.classList.toggle("sel",g.dataset.note===k));
    $("#fgNote").innerHTML=`<h3>${esc(n[0])}</h3><p>${esc(n[1])}</p>${n[2]&&n[2].length?`<div class="refs">${n[2].map(([l,b,c])=>{const d=b?dayOf(b,c):0;return d?`<button data-figday="${d}">${I.open}${esc(l)}${isDone(d)?" ✓":""}</button>`:`<span class="refx">${esc(l)}</span>`}).join("")}</div>`:""}`;
    if(!reduced())$("#fgNote").animate([{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:260,easing:"ease-out"});
    $("#fgNote").querySelectorAll("[data-figday]").forEach(b=>b.onclick=()=>{state.selected=+b.dataset.figday;lsWrite();closeFig();setView("today")})};
  // pan / zoom
  const st=$("#fgStage"),pz=$("#fgPz");let s=1,tx=0,ty=0,moved=false;const ptr=new Map();let last=null;
  const apply=(anim)=>{pz.style.transition=anim&&!reduced()?"transform .3s cubic-bezier(.16,1,.3,1)":"none";pz.style.transform=`translate(${tx}px,${ty}px) scale(${s})`};
  const clamp=()=>{const r=st.getBoundingClientRect(),w=r.width,h=pz.offsetHeight;tx=Math.min(0,Math.max(w-w*s,tx));ty=Math.min(0,Math.max(h-h*s,ty));if(s===1){tx=0;ty=0}};
  const zoomAt=(ns,cx,cy,anim)=>{ns=Math.min(5,Math.max(1,ns));const r=st.getBoundingClientRect();const px=cx-r.left,py=cy-r.top;tx=px-(px-tx)*ns/s;ty=py-(py-ty)*ns/s;s=ns;clamp();apply(anim);st.classList.toggle("zoomed",s>1)};
  const mid=()=>{const r=st.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
  $("#zIn").onclick=()=>zoomAt(s*1.6,...mid(),1);$("#zOut").onclick=()=>zoomAt(s/1.6,...mid(),1);$("#zFit").onclick=()=>{s=1;tx=ty=0;apply(1);st.classList.remove("zoomed")};
  st.addEventListener("wheel",e=>{if(!e.ctrlKey&&!e.metaKey&&s===1&&Math.abs(e.deltaY)<40)return;e.preventDefault();zoomAt(s*Math.exp(-e.deltaY*.0025),e.clientX,e.clientY)},{passive:false});
  st.addEventListener("dblclick",e=>zoomAt(s>1.5?1:2.4,e.clientX,e.clientY,1));
  st.addEventListener("pointerdown",e=>{if(e.target.closest(".zoomctl"))return;ptr.set(e.pointerId,[e.clientX,e.clientY]);moved=false;last=null});
  st.addEventListener("pointermove",e=>{if(!ptr.has(e.pointerId))return;const p=ptr.get(e.pointerId);const nx=e.clientX,ny=e.clientY;
    if(ptr.size===1){const dx=nx-p[0],dy=ny-p[1];if(Math.abs(dx)+Math.abs(dy)>3)moved=true;if(s>1){tx+=dx;ty+=dy;clamp();apply()}}
    ptr.set(e.pointerId,[nx,ny]);
    if(ptr.size===2){const [a,b]=[...ptr.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(last)zoomAt(s*d/last,(a[0]+b[0])/2,(a[1]+b[1])/2);last=d;moved=true}});
  const up=e=>{ptr.delete(e.pointerId);if(ptr.size<2)last=null};
  st.addEventListener("pointerup",up);st.addEventListener("pointercancel",up);
  st.addEventListener("click",e=>{if(moved){e.stopPropagation();moved=false;return}const g=e.target.closest("[data-note]");if(g)show(g.dataset.note)},true);
  st.addEventListener("keydown",e=>{const g=e.target.closest("[data-note]");if(g&&(e.key==="Enter"||e.key===" ")){e.preventDefault();show(g.dataset.note)}});
  // route filter
  document.querySelectorAll(".fig-legend button").forEach(b=>b.onclick=()=>{const on=b.getAttribute("aria-pressed")!=="true";document.querySelectorAll(".fig-legend button").forEach(x=>x.setAttribute("aria-pressed",x===b&&on));
    document.querySelectorAll(".figv .g-route").forEach(g=>{const hit=!on||g.dataset.route===b.dataset.rt;g.classList.toggle("dim",!hit);if(hit&&on&&!reduced()){const l=g.querySelector(".g-line");l.style.animation="none";void l.getBoundingClientRect();l.style.animation="";l.style.setProperty("--d","0s")}})});
  $("#fgClose").onclick=closeFig;
  $("#fgPrev").onclick=()=>{closeFig(true);openFig(FIG_ORDER[(nav+FIG_ORDER.length-1)%FIG_ORDER.length])};
  $("#fgNext").onclick=()=>{closeFig(true);openFig(FIG_ORDER[(nav+1)%FIG_ORDER.length])};
  if(FIGS[id].map&&!GEO)loadGeo().then(()=>{if(figCur===id&&$("#fgPz")){$("#fgPz").innerHTML=figSVG(id)}});
  if(focus)show(focus);
  setTimeout(()=>$("#fgClose")?.focus(),50);
}
function closeFig(instant){const v=$(".figv");figCur=null;if(!v)return;document.body.style.overflow=R?"hidden":"";
  if(instant||reduced()){v.remove();return}
  v.animate([{opacity:1},{opacity:0,transform:"translateY(16px)"}],{duration:200,easing:"ease-in",fill:"forwards"}).onfinish=()=>v.remove()}
