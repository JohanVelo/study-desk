"""Build the standalone Lamp app (dist/) from the Claude version (lamp/lamp.html).
Usage: python3 build.py [supabase_url] [publishable_key]"""
import json, os, re, shutil, sys, time
D = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(D, "src"); LAMP = os.path.join(D, "..", "lamp"); OUT = os.path.join(D, "dist")
# big data (Bible text, art, Greek/Hebrew) is not duplicated in lamp-src: take it from the deployed lamp/ folder
DATA = LAMP if os.path.isdir(os.path.join(LAMP, "bib")) else os.path.join(D, "..", "..", "lamp")
ORIG = os.path.join(SRC, "orig") if os.path.isdir(os.path.join(SRC, "orig")) else os.path.join(DATA, "orig")
cfg_path = os.path.join(D, "config.json")
cfg = json.load(open(cfg_path)) if os.path.exists(cfg_path) else {}
if len(sys.argv) > 2: cfg = {"url": sys.argv[1], "key": sys.argv[2]}; json.dump(cfg, open(cfg_path, "w"))

s = open(os.path.join(LAMP, "lamp.html"), encoding="utf-8").read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    if c != n: sys.exit(f"count {c}!={n}: {a[:100]}")
    s = s.replace(a, b)

# --- words: no Claude in the app version ---
rep("You're signed in through Claude, so Lamp remembers you. No password, and nothing to set up.", "Lamp keeps you signed in, so it remembers everything you do.")
rep("When you finish the path, ask Claude in our chat to add more. Good next steps are", "When you finish the path, more is on the way. Good next steps are")
rep("Nothing matches that yet. Ask Claude about it in the Ask tab.", "Nothing matches that yet. Try another word.")
rep('synced to your Claude account, so they follow you between devices', 'synced to your Lamp account, so they follow you between devices')
rep("Group features (shared answers, prayer, live games) switch on when you open Lamp inside Claude. For now everything saves on this device.</span>",
    "You're looking around without an account, so everything saves on this phone only.</span><button class=\"btn sm primary\" onclick=\"LAMP_APP.signIn()\">Sign in or join</button>")
rep('toast("Live games need Lamp open inside Claude with edit access.")', 'toast("Sign in to play live games with the group.")')
rep("Live games connect everyone's phones, so they work when Lamp is open inside Claude.", "Live games connect everyone's phones, so sign in to play with the group.")
rep("saving to the group needs your group leader to give you edit access.", "saving to the group needs you to sign in.")
rep('<li>Open Lamp in Claude and tap <b>Share</b> at the top of the page.</li><li>Add each person by email and give them <b>edit</b> access, so their answers, prayers and scores can save.</li><li>Each person signs in to Claude once (a free account works). After that Lamp remembers them on every device.</li>',
    '<li>Send everyone the message below. It has the link and your group code.</li><li>Each person opens the link, makes an account with their name, email, a password and the code.</li><li>They add Lamp to their home screen, and it stays signed in from then on.</li>')
# invite message and install guide for the real app
rep('const LAMP_URL="https://claude.ai/artifact/NBuYLpeGQTdiA1wZYzjUGN";', 'const LAMP_URL=location.origin+location.pathname.replace(/index\\.html$/,"");')
i = s.index("function inviteMsg(){"); j = s.index("function openLeader(){")
s = s[:i] + r'''function inviteMsg(){const w=WK(curWk());return `Hi everyone! Our Bible study now has its own app, Lamp 🪔
This week: ${w.title} (${w.ref}).

1. Open this link on your phone: ${LAMP_URL}
2. Tap "Make an account". Use your first name, email, a password you choose, and our group code: ${G.code||"(ask me for it)"}
3. Add it to your home screen: on iPhone tap Share, then Add to Home Screen. On Android tap ⋮, then Add to Home screen or Install app.

It opens like any other app and keeps you signed in.`}
''' + s[j:]
rep('''["Open Lamp in Safari","If it opens in the Claude app instead, use Copy the Lamp link below and paste it into Safari's address bar."]''', '''["Open Lamp in Safari","Use the link from your group message. If it opened in another app, use Copy the Lamp link below and paste it into Safari."]''')
rep('''["Open Lamp in Chrome","If it opens in the Claude app instead, use Copy the Lamp link below and paste it into Chrome's address bar."]''', '''["Open Lamp in Chrome","Use the link from your group message. If it opened in another app, use Copy the Lamp link below and paste it into Chrome."]''')
rep('<p class="muted inote">Lamp lives inside Claude, so a thin Claude bar can show at the top and the icon may show Claude\'s logo. Your account, answers and progress all stay synced.</p>',
    '<p class="muted inote">Lamp then opens full screen with its own icon, and you stay signed in.</p>')
rep('const isPhone=()=>matchMedia("(pointer:coarse)").matches&&innerWidth<820;', 'const isPhone=()=>matchMedia("(pointer:coarse)").matches&&innerWidth<820&&!matchMedia("(display-mode: standalone)").matches&&!navigator.standalone;')
# no Claude-powered features in the app version
rep('const VIEWS=[["today","Today"],["group","Group"],["path","My path"],["learn","Learn"],["journal","Journal"],["ask","Ask"]];',
    'const VIEWS=[["today","Today"],["group","Group"],["path","My path"],["learn","Learn"],["journal","Journal"]];')
rep('const n={"1":"today","2":"group","3":"path","4":"learn","5":"journal","6":"ask"}[e.key]', 'const n={"1":"today","2":"group","3":"path","4":"learn","5":"journal"}[e.key]')
rep('.tabbar{display:grid;grid-template-columns:repeat(6,1fr);', '.tabbar{display:grid;grid-template-columns:repeat(5,1fr);')
rep('</style>', '#explain,#quizBtn,#askAbout,#vAsk,#iceGen,.tmake,#explainOut,#quizOut,.deeper{display:none!important}\n.gnote .btn{margin-left:auto;flex:none}\n</style>')
# account in Settings
rep('''    <div class="field"><span>Home screen</span>''', '''    ${window.LAMP_APP?.signedIn?`<div class="field"><span>Your account</span><small>Signed in as <b>${esc(LAMP_APP.name)}</b> (${esc(LAMP_APP.email)}).</small><div class="opts"><button id="acName">Change my name</button><button id="acOut">Sign out</button></div></div>`:`<div class="field"><span>Your account</span><small>You're looking around without an account. Sign in to save to the group.</small><div class="opts"><button id="acIn">Sign in or join</button></div></div>`}
    <div class="field"><span>Home screen</span>''')
rep('''  $("#setInstall").onclick=()=>{close();openInstall()};''', '''  $("#setInstall").onclick=()=>{close();openInstall()};
  $("#acOut")?.addEventListener("click",()=>{$("#acOut").parentNode.innerHTML=`<button id="acOut2" class="danger">Yes, sign me out</button><button id="acKeep">Stay signed in</button>`;$("#acOut2").onclick=()=>LAMP_APP.signOut();$("#acKeep").onclick=()=>openSettings()});
  $("#acIn")?.addEventListener("click",()=>LAMP_APP.signIn());
  $("#acName")?.addEventListener("click",()=>{const z=$("#acName").parentNode;z.innerHTML=`<input id="acNm" class="search" maxlength="40" value="${esc(LAMP_APP.name)}" style="flex:1;min-width:0"><button id="acSave">Save</button>`;$("#acNm").focus();$("#acSave").onclick=async()=>{if(await LAMP_APP.rename($("#acNm").value)){toast("Name updated");ME.first=LAMP_APP.name.split(" ")[0];openSettings();render()}else toast("Couldn't save that. Try again.")}});''')
# leaders see the group code (and can change it)
rep('async function groupConnect(db,user){', 'async function groupConnect(db,user){\n  window.LAMP_APP?.code?.().then(c=>{G.code=c||""}).catch(()=>{});')
rep('''    <div class="field"><span>Message to send them</span>''', '''    ${G.code?`<div class="field"><span>Group code</span><div class="gcode"><b id="ldCode">${esc(G.code)}</b><button class="btn sm ghost" id="ldNewCode">Make a new code</button></div><small>New people need this code to join. Making a new one doesn't affect anyone who has already joined.</small></div>`:""}
    <div class="field"><span>Message to send them</span>''')
rep('''  $("#ldMsg").onfocus=e=>e.target.select();''', '''  $("#ldMsg").onfocus=e=>e.target.select();
  $("#ldNewCode")?.addEventListener("click",async()=>{const c=await LAMP_APP.newCode().catch(()=>null);if(!c)return toast("Couldn't change the code. Try again.");G.code=c;$("#ldCode").textContent=c;$("#ldMsg").value=inviteMsg();toast("New code ready")});''')
rep('</style>', '.gcode{display:flex;align-items:center;gap:12px;margin:4px 0 6px}.gcode b{font-family:var(--f-mono,monospace);font-size:1.35rem;letter-spacing:.14em;padding:6px 14px;border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--ink)}\n</style>')

# --- split the head bits off the front of the page ---
k = s.index("<style>"); head_bits, body = s[:k], s[k:]
head_bits = re.sub(r"<title>.*?</title>", "", head_bits, flags=re.S)
head_bits = re.sub(r'<meta name="claude:[^>]*>', "", head_bits)
build = time.strftime("%Y%m%d%H%M%S")
splash = "".join(f'<link rel="apple-touch-startup-image" href="splash/{f}" media="(device-width: {int(f.split("x")[0])//d}px) and (device-height: {int(f.split("x")[1].split(".")[0])//d}px) and (-webkit-device-pixel-ratio: {d}) and (orientation: portrait)">'
                 for f in sorted(os.listdir(os.path.join(SRC, "splash"))) for d in [2 if f.startswith(("828x", "750x")) else 3])
html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Lamp</title>
<meta name="description" content="Read the Bible one chapter a day and study together with your group.">
<meta name="theme-color" content="#F4F1EA" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121614" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Lamp">
<meta name="format-detection" content="telephone=no">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-64.png">
<link rel="apple-touch-icon" href="icons/apple-180.png">
{splash}
{head_bits.strip()}
<link rel="stylesheet" href="app.css?v={build}">
<script>window.LAMP_CONFIG={json.dumps(cfg)};</script>
<script src="supabase.js"></script>
<script src="app.js?v={build}"></script>
</head>
<body>
{body}
</body>
</html>
'''
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
for f in ["app.js", "app.css", "supabase.js", "manifest.webmanifest"]: shutil.copy(os.path.join(SRC, f), OUT)
open(os.path.join(OUT, "sw.js"), "w").write(open(os.path.join(SRC, "sw.js")).read().replace("__BUILD__", build))
for d in ["icons", "splash"]: shutil.copytree(os.path.join(SRC, d), os.path.join(OUT, d))
for f in ["bible.json", "geo.json", "tests.json"]: shutil.copy(os.path.join(DATA, f), OUT)
for d in ["art", "bib"]: shutil.copytree(os.path.join(DATA, d), os.path.join(OUT, d))
more = os.path.join(SRC, "artmore")
if os.path.isdir(more):
    for f in os.listdir(more): shutil.copy(os.path.join(more, f), os.path.join(OUT, "art"))
shutil.copytree(ORIG, os.path.join(OUT, "orig"))
open(os.path.join(OUT, ".nojekyll"), "w").write("")
print("built", build, "config:", "yes" if cfg.get("url") else "none")
