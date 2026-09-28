U=https://content-queen-production.up.railway.app
for i in $(seq 1 40); do
  sleep 20
  D=$(railway status --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const e=j.environments.edges[0].node.serviceInstances.edges.map(x=>x.node).find(n=>(n.activeDeployments||[]).length);const d=e&&e.activeDeployments[0];console.log(d.id.slice(0,8)+' '+d.status+' '+d.deploymentStopped)}catch(e){console.log('?')}})")
  case "$D" in e45decc2*SUCCESS*false) echo "deploy live"; break;; esac
done
echo "page has no example: $(curl -s --max-time 25 "$U/demo/make-a-video" | grep -c 'eg-frame')"
J=$(curl -s --max-time 30 -X POST "$U/demo/make-video" -H 'Content-Type: application/json' \
  -d '{"topic":"how do I handle an angry parent on the phone"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).jobId||'ERR'))")
echo "job $J"; echo "$J" > .jobid
for i in $(seq 1 50); do
  R=$(curl -s --max-time 25 "$U/demo/make-video/$J")
  L=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(new Date().toISOString().slice(11,19)+' '+j.status+' '+(j.stage||'')+' '+(j.error?('ERR '+j.error.slice(0,300)):''))}catch(e){console.log('?')}})")
  echo "$L"
  case "$L" in *written*) echo "=== STEP 3 CLEARED: SCRIPT READY ==="; echo "$R" > .step3.json; exit 0;; *failed*) exit 2;; esac
  sleep 20
done
