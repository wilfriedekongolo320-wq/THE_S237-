#!/bin/bash
cd /c/chariow/KATASHIE_VPN_FIXED_CORRECTED || exit 1
find . -name "*.sh" -type f | sort | while IFS= read -r f; do
  echo "CHECK $f"
  bash -n "$f" 2>&1
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "FAILED $f"
  fi
  echo "---"
done
'
