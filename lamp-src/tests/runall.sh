#!/usr/bin/env bash
# Runs every Lamp test, one at a time, and stops at the first failure.
# Needs: lamp/ served on 127.0.0.1:8765 and app/dist on localhost:8767 (see CLAUDE.md).
cd "$(dirname "$0")"
export PW="${PW:-$(npm root -g)/playwright}"
pass=0; failed=()
for t in t36 t37 t38 t40 t41 t42 t43 t44 t45 t46 t47 t48 t25 t27 t28 t31 t33 t34 t16 ../app/t23 ../app/t26 ../app/t29 ../app/t30 ../app/t32 ../app/t35; do
  [ -f "$t.js" ] || continue
  printf '%-10s ' "$t"
  out=$(timeout 900 node "$t.js" 2>&1); code=$?
  if [ $code -ne 0 ] || echo "$out" | grep -q 'FAIL\|FAILED\|ERR [^n]'; then echo "FAILED"; echo "$out" | grep -E 'FAIL|Error|ERR' | head -8; failed+=("$t"); else echo "ok"; pass=$((pass+1)); fi
done
echo "$pass passed, ${#failed[@]} failed ${failed[*]}"
[ ${#failed[@]} -eq 0 ]
