U=https://content-queen-production.up.railway.app
J=$(cat .jobid)
for i in $(seq 1 150); do
  R=$(curl -s --max-time 25 "$U/demo/make-video/$J")
  echo "$R" > .prod.json
  LINE=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const p=j.produce||{};console.log(new Date().toISOString().slice(11,19)+' '+j.status+' | '+(p.status||'-')+' '+(p.stage||'')+' '+(p.error?('ERR: '+p.error.slice(0,300)):'')+' '+(p.youtube?JSON.stringify(p.youtube):''))})")
  echo "$LINE"
  case "$LINE" in *published*|*failed*) exit 0;; esac
  sleep 30
done
