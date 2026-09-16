U=https://content-queen-production.up.railway.app
for i in $(seq 1 40); do
  sleep 20
  D=$(railway status --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const e=j.environments.edges[0].node.serviceInstances.edges.map(x=>x.node).find(n=>(n.activeDeployments||[]).length);const d=e&&e.activeDeployments[0];console.log(d.id.slice(0,8)+' '+d.status+' '+d.deploymentStopped)}catch(e){console.log('?')}})")
  case "$D" in 6de2435b*SUCCESS*false) echo "deploy live"; break;; esac
done
J=$(curl -s --max-time 30 -X POST "$U/demo/make-video" -H 'Content-Type: application/json' \
  -d '{"topic":"how do I handle an angry parent on the phone"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).jobId||'ERR'))")
echo "job $J"
for i in $(seq 1 45); do
  L=$(curl -s --max-time 25 "$U/demo/make-video/$J" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(j.status+' '+(j.stage||'')+' '+(j.error?('ERR '+j.error.slice(0,200)):''))}catch(e){console.log('?')}})")
  echo "$L"
  case "$L" in written*) break;; *ERR*) exit 2;; esac
  sleep 20
done
echo "=== the saved file ==="
curl -s --max-time 30 "$U/demo/make-video/$J/script.md" | head -12
echo "..."
curl -s --max-time 30 "$U/demo/make-video/$J/script.md" | grep -A 9 '## The checkpoint'
