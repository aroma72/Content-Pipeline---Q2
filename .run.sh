U=https://content-queen-production.up.railway.app
for i in $(seq 1 45); do
  sleep 20
  D=$(railway status --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const e=j.environments.edges[0].node.serviceInstances.edges.map(x=>x.node).find(n=>(n.activeDeployments||[]).length);const d=e&&e.activeDeployments[0];console.log(d.id.slice(0,8)+' '+d.status+' '+d.deploymentStopped)}catch(e){console.log('?')}})")
  case "$D" in dffcc30f*SUCCESS*false) echo "deploy live"; break;; esac
done
J=$(curl -s --max-time 30 -X POST "$U/demo/make-video" -H 'Content-Type: application/json' \
  -d '{"topic":"how do I handle an angry parent on the phone"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).jobId||'ERR'))")
echo "job $J"
for i in $(seq 1 45); do
  L=$(curl -s --max-time 25 "$U/demo/make-video/$J" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(j.status+' '+(j.stage||'')+' '+(j.error?('ERR '+j.error.slice(0,250)):''))}catch(e){console.log('?')}})")
  case "$L" in written*) echo "SCRIPT READY";  break;; *ERR*) echo "$L"; exit 2;; esac
  sleep 20
done
curl -s --max-time 40 -X POST "$U/demo/make-video/$J/produce" \
  -H 'Content-Type: application/json' -d '{"publish":true,"by":"Aroma"}' > /dev/null
for i in $(seq 1 240); do
  R=$(curl -s --max-time 25 "$U/demo/make-video/$J")
  L=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const p=j.produce||{};console.log(new Date().toISOString().slice(11,19)+' '+j.status+' '+(p.stage||'')+' '+(p.error?('ERR '+p.error.slice(0,400)):'')+' '+(p.youtube?p.youtube.url:''))}catch(e){console.log('?')}})")
  echo "$L"
  case "$L" in *youtu*) exit 0;; *"ERR "*) exit 2;; *awaiting_review*) exit 3;; esac
  sleep 30
done
