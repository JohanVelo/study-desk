#!/bin/bash
# Full regression. Needs: npm install (here), the app served on 8765 from the repo root,
# and for t7 a subfolder server on 8777 (see tests/README.md). Results in reg/*.out.
cd "$(dirname "$0")"; mkdir -p reg shots shots410 shots412
for t in t13 t14 t15 t16 t17 t18 t19 t20 t22 t23 t24 t25; do timeout 900 node $t.js > reg/$t.out 2>&1; echo "$t: $(grep -c '^FAIL' reg/$t.out) fail, $(tail -1 reg/$t.out) | $(grep -m1 '^ERRORS' reg/$t.out | cut -c1-200)"; done
for t in t3 t6 t9 t10 t11 t12; do timeout 900 node -r ./with-sample.js $t.js > reg/$t.out 2>&1; echo "$t: $(grep -c '^FAIL' reg/$t.out) fail, $(tail -1 reg/$t.out) | $(grep -m1 '^ERRORS' reg/$t.out | cut -c1-200)"; done
# offline tests need the old sample subjects inside data.js itself; always restored afterwards
cp ../data.js reg/data-keep.js; cp sample-data.js ../data.js; trap 'cp reg/data-keep.js ../data.js' EXIT
for t in t2 t5 t7 t8; do timeout 900 node $t.js > reg/$t.out 2>&1; echo "$t: $(grep -c '^FAIL' reg/$t.out) fail, $(tail -1 reg/$t.out) | $(grep -m1 '^ERRORS' reg/$t.out | cut -c1-200)"; done
cp reg/data-keep.js ../data.js; echo "data.js empty again: $(grep -c 'subjects: \[\]' ../data.js)"
echo DONE
