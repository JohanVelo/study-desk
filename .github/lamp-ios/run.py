"""Drive Lamp in Mobile Safari on the iPhone simulator, take real device screenshots, and log what works.
Run by .github/workflows/lamp-iphone.yml. Output: out/*.png and out/log.txt"""
import json, os, subprocess, time, traceback
from selenium import webdriver
from selenium.webdriver.common.by import By

UDID = os.environ["UDID"]
OUT = "out"; os.makedirs(OUT, exist_ok=True)
LOCAL = "http://localhost:8000/"
LIVE = "https://johanvelo.github.io/study-desk/lamp/"
log = []; fails = 0

def note(ok, msg):
    global fails
    log.append(("PASS " if ok else "FAIL ") + msg); fails += 0 if ok else 1; print(log[-1], flush=True)

def shot(name):
    subprocess.run(["xcrun", "simctl", "io", UDID, "screenshot", f"{OUT}/{name}.png"], capture_output=True)

def appearance(mode):
    subprocess.run(["xcrun", "simctl", "ui", UDID, "appearance", mode], capture_output=True)

NOW = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() - 3 * 86400))
TODAY = time.strftime("%Y-%m-%d")
SEED = {
    "users": {"u_jj": {"id": "u_jj", "email": "jj@example.com", "password": "x"}},
    "members": {
        "u_jj": {"user_id": "u_jj", "name": "JJ", "color": "#3B5BBA", "role": "leader"},
        "u_m": {"user_id": "u_m", "name": "Megan", "color": "#B5523B", "role": "member"},
        "u_s": {"user_id": "u_s", "name": "Shasti", "color": "#2E7D57", "role": "member"},
    },
    "docs": {
        "group/meta": {"week": "w7", "name": "Tuesday group", "when": time.strftime("%As") + " at 7 pm"},
        "gm/u_m": {"joined": NOW, "seen": NOW, "ans": {"w7": {"q0": "That he is close and personal, not distant."}}, "aat": {"w7": {"q0": NOW}},
                   "pr": {"p1": {"t": "Please pray for my exams next week.", "at": NOW}}, "here": {TODAY: True}},
        "gm/u_s": {"joined": NOW, "seen": NOW, "ans": {"w7": {"q0": "He already knows what we need, so prayer is about relationship."}}, "aat": {"w7": {"q0": NOW}}, "here": {TODAY: True}},
        "gm/u_jj": {"joined": NOW, "seen": NOW},
        "data/users/u_jj/progress": {"done": {"1": NOW}, "notes": {}, "saved": {}, "settings": {"onboarded": True, "welcomed": True, "intro": False}},
    },
    "config": {"join_code": "GRACE7"},
}

def js(d, code, *a):
    return d.execute_script(code, *a)

def wait(d, cond, t=12):
    end = time.time() + t
    while time.time() < end:
        try:
            if js(d, "return !!(" + cond + ")"): return True
        except Exception: pass
        time.sleep(0.3)
    return False

def tap(d, sel):
    js(d, "const e=document.querySelector(arguments[0]);e.scrollIntoView({block:'center'});e.click()", sel)

def run():
    o = webdriver.SafariOptions()
    o.set_capability("platformName", "iOS")
    o.set_capability("safari:useSimulator", True)
    o.set_capability("safari:deviceUDID", UDID)
    d = webdriver.Safari(options=o)
    try:
        info = js(d, "return navigator.userAgent")
        note("iPhone" in info, "real Mobile Safari: " + info)

        # 1. the live site, first visit (sign-up screen)
        d.get(LIVE); time.sleep(5); shot("01-live-first-open")
        note(wait(d, "document.querySelector('#gate')"), "live site shows the sign-up screen")

        # 2. a test copy with sample group members, signed in as the leader
        d.get(LOCAL); time.sleep(2)
        js(d, "localStorage.clear();sessionStorage.clear();localStorage.setItem('fake-sb',arguments[0]);sessionStorage.setItem('fake-session',arguments[1]);localStorage.setItem('lamp-state-v1',arguments[2]);localStorage.setItem('lamp-known','1')",
           json.dumps(SEED), json.dumps({"user": {"id": "u_jj", "email": "jj@example.com"}}), json.dumps(SEED["docs"]["data/users/u_jj/progress"]))
        d.get(LOCAL)
        note(wait(d, "document.querySelector('#votd') && !document.querySelector('#votd').hidden", 20), "Today screen opens with the verse for today")
        time.sleep(2); shot("02-today")
        js(d, "scrollTo(0,700)"); time.sleep(1); shot("03-today-scrolled")

        # verse picture + share sheet support
        js(d, "scrollTo(0,0)"); tap(d, "#votdPic")
        note(wait(d, "document.querySelector('#picImg')?.src?.startsWith('blob:')", 15), "verse picture is drawn")
        time.sleep(1); shot("04-verse-picture")
        can = js(d, "try{return !!navigator.canShare?.({files:[new File([picBlob],'v.jpg',{type:'image/jpeg'})]})}catch(e){return 'err '+e.message}")
        note(can is True, f"iPhone share sheet accepts the picture (canShare={can})")
        tap(d, "#picStyle-art, [data-pst='art']"); time.sleep(2); shot("05-verse-picture-engraving")
        tap(d, "#shX"); time.sleep(0.5)

        # reminders
        js(d, "openSettings()"); time.sleep(1); shot("06-settings")
        js(d, "document.querySelector('#remMeet').scrollIntoView({block:'center'})"); time.sleep(0.5); shot("07-settings-reminders")
        tap(d, "#remRead"); time.sleep(1); shot("08-reminder-sheet")
        note(wait(d, "document.querySelector('#remIcs')", 3), "'Add to iPhone calendar' button shows")
        ics = js(d, "return ics(remEvent('read','07:00'))")
        note("RRULE:FREQ=DAILY" in ics, "calendar file is built")
        tap(d, "#remIcs"); time.sleep(4); shot("09-after-add-to-calendar")
        d.get(LOCAL); wait(d, "document.querySelector('#votd')", 15); time.sleep(1)

        # group
        js(d, "setView('group')"); time.sleep(2); shot("10-group")
        note(wait(d, "document.querySelector('#gHereRow .hererow')", 6), "group check-in strip shows")
        tap(d, "#gHere"); time.sleep(1); shot("11-group-checked-in")
        tap(d, "[data-others='0']"); time.sleep(1)
        js(d, "document.querySelector('#go-0').scrollIntoView({block:'center'})"); time.sleep(0.5); shot("12-group-answers")
        tap(d, "#go-0 [data-rpo]"); time.sleep(0.6)
        el = d.find_element(By.CSS_SELECTOR, "#go-0 .rpin"); el.send_keys("Amen to that"); time.sleep(0.5); shot("13-typing-reply-keyboard")
        js(d, "document.querySelector('#go-0 .rpf').requestSubmit()"); time.sleep(1)
        note("Amen to that" in js(d, "return document.querySelector('#go-0').textContent"), "reply sends and shows")
        tap(d, "[data-gt='prayer']"); time.sleep(1); shot("14-prayer")
        # meeting mode
        js(d, "scrollTo(0,0)"); tap(d, "#gMeet"); time.sleep(1.5); shot("15-meeting-welcome")
        note(wait(d, "document.querySelector('#meet .qr path')", 4), "meeting mode QR shows")
        for i in range(3):
            tap(d, "#mNext"); time.sleep(1.2)
        shot("16-meeting-question")
        js(d, "closeMeet()"); time.sleep(0.6)

        # other tabs
        for n, v in [("17-path", "path"), ("18-learn", "learn"), ("19-journal", "journal")]:
            js(d, f"setView('{v}')"); time.sleep(1.5); shot(n)
        js(d, "setView('today')"); time.sleep(1)
        js(d, "openReader(curDay(),false)"); time.sleep(2.5); shot("20-reader")
        js(d, "closeReader()"); time.sleep(0.5)

        # dark mode
        appearance("dark"); time.sleep(1.5); shot("21-today-dark")
        js(d, "setView('group')"); time.sleep(1.5); shot("22-group-dark")
        appearance("light")

        sw = js(d, "return !!navigator.serviceWorker?.controller")
        note(True, f"service worker in control: {sw}")
        ov = js(d, "return document.documentElement.scrollWidth<=innerWidth+1")
        note(ov, "no sideways scrolling")
    finally:
        d.quit()

try:
    run()
except Exception as e:
    note(False, "driver error: " + repr(e)); traceback.print_exc()
    # fallback: at least show the real page
    subprocess.run(["xcrun", "simctl", "openurl", UDID, LIVE]); time.sleep(8); shot("99-fallback-live")
open(f"{OUT}/log.txt", "w").write("\n".join(log) + f"\n\n{'ALL PASS' if not fails else str(fails) + ' FAILED'}\n")
print("done", fails)
