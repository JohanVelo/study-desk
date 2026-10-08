#!/bin/bash
# Full regression. Needs: npm install (here), the app served from the repo root on SD_PORT, and for t7 a second server
# on SD_PORT2 serving a folder whose /study-desk/ is this repo (see tests/README.md). Results in reg/*.out + reg/runall.json.
#   SD_PORT=8866 SD_PORT2=8867 bash runall.sh                  full run, compared with baseline/runall.json (exit 1 if any test got worse)
#   ... RUNALL_ONLY=t7 bash runall.sh                           one test, same guards, same data.js swap if it needs one
#   ... WRITE_BASELINE=1 bash runall.sh                         record this run as the baseline instead of comparing
# Fire tests only: RUNALL_FORCE_WORSE=<t> adds a FAIL line to <t>; RUNALL_KILL_EARLY=<t> kills <t> after 3 s;
#   RUNALL_FIRE=1 RUNALL_ONLY=t7 T7_PLANT=block-sw prints t7's own output and exits with its code (no comparison).
cd "$(dirname "$0")"
export NODE_OPTIONS="--require=$(pwd -W 2>/dev/null || pwd)/mute.js"  # every test browser muted (podcast tests play audio)
die() { echo "FAIL setup $*"; exit 2; }
[ -z "$SD_PORT" ] || [ "$SD_PORT" = 8765 ] && die "SD_PORT is '${SD_PORT}' (8765 is the QGIS bridge); run with SD_PORT=8866 SD_PORT2=8867"
[ -z "$SD_PORT2" ] || [ "$SD_PORT2" = 8765 ] && die "SD_PORT2 is '${SD_PORT2}'"
[ -n "$TAPPROBE_LIVE" ] && die "TAPPROBE_LIVE is set; it is a test-only switch"
if [ -n "$T7_PLANT" ] && ! { [ "$RUNALL_FIRE" = 1 ] && [ "$RUNALL_ONLY" = t7 ]; }; then die "T7_PLANT is set outside a t7 fire test"; fi
[ "$(grep -c 'subjects: \[\]' ../data.js)" = 1 ] || die "../data.js is not the empty shipped file; restore it before running"
# the second server must serve THIS tree (C:/dev/pages-root2), never another copy of the app
for f in app.js sw.js; do cmp -s <(curl -s --max-time 5 "http://localhost:$SD_PORT2/study-desk/$f") "../$f" || die "http://localhost:$SD_PORT2/study-desk/$f is not this repo's $f (serve C:/dev/pages-root2 on $SD_PORT2)"; done
mkdir -p reg shots shots410 shots412
ALL1="t13 t14 t15 t16 t17 t18 t19 t20 t22 t23 t24 t25 t26"; ALL2="t3 t6 t9 t10 t11 t12"; ALL3="t2 t5 t7 t8"
pick() { local out=""; for t in $1; do if [ -z "$RUNALL_ONLY" ] || [ "$RUNALL_ONLY" = "$t" ]; then out="$out $t"; fi; done; echo $out; }
run() {  # run <test> [preload]: record exit code and timeout flag next to the output
  local t=$1 lim=900; [ "$RUNALL_KILL_EARLY" = "$t" ] && lim=3
  timeout $lim node $2 $t.js > reg/$t.out 2>&1; local rc=$?; echo $rc > reg/$t.exit
  [ "$RUNALL_FORCE_WORSE" = "$t" ] && echo "FAIL forced worse (fire test)" >> reg/$t.out
  [ "$RUNALL_FIRE" = 1 ] && cat reg/$t.out
  echo "$t: exit $rc$([ $rc = 124 ] && echo ' TIMEOUT'), $(grep -c '^FAIL' reg/$t.out) fail, $(tail -1 reg/$t.out | cut -c1-80) | $(grep -m1 '^ERRORS' reg/$t.out | cut -c1-160)"
}
for t in $(pick "$ALL1"); do run $t; done
for t in $(pick "$ALL2"); do run $t "-r ./with-sample.js"; done
SWAP=$(pick "$ALL3")
if [ -n "$SWAP" ]; then
  # offline tests need the old sample subjects inside data.js itself; always restored afterwards
  cp ../data.js reg/data-keep.js; trap 'cp reg/data-keep.js ../data.js' EXIT; cp sample-data.js ../data.js
  for t in $SWAP; do run $t; done
  cp reg/data-keep.js ../data.js; trap - EXIT
fi
echo "data.js empty again: $(grep -c 'subjects: \[\]' ../data.js)"
[ "$(grep -c 'subjects: \[\]' ../data.js)" = 1 ] || { echo "FAIL setup data.js was not restored"; exit 2; }
if [ "$RUNALL_FIRE" = 1 ]; then rc=$(cat reg/$RUNALL_ONLY.exit); echo DONE; exit $rc; fi
node runall-cmp.js $(pick "$ALL1 $ALL2 $ALL3"); rc=$?
echo DONE; exit $rc
