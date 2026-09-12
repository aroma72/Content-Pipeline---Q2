set -e
U=https://content-queen-production.up.railway.app
# Wait for the new build.
for i in $(seq 1 40); do
  sleep 20
  D=$(railway status --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const e=j.environments.edges[0].node.serviceInstances.edges.map(x=>x.node).find(n=>(n.activeDeployments||[]).length);const d=e&&e.activeDeployments[0];console.log(d?d.id.slice(0,8)+' '+d.status+' '+d.deploymentStopped:'?')}catch(e){console.log('?')}})")
  case "$D" in 21213c16*SUCCESS*false) echo "deploy live"; break;; esac
done
# Write the script.
J=$(curl -s --max-time 30 -X POST "$U/demo/make-video" -H 'Content-Type: application/json' -d '{"topic":"how do I handle an angry parent on the phone"}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).jobId||'ERR'))")
echo "job $J"
for i in $(seq 1 45); do
  ST=$(curl -s --max-time 25 "$U/demo/make-video/$J" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(j.status)}catch(e){console.log('?')}})")
  case "$ST" in written) echo "script READY"; break;; failed) echo "WRITE FAILED"; exit 1;; esac
  sleep 20
done
# Produce it.
curl -s --max-time 40 -X POST "$U/demo/make-video/$J/produce" > /dev/null
for i in $(seq 1 180); do
  R=$(curl -s --max-time 25 "$U/demo/make-video/$J")
  echo "$R" > .prod.json
  LINE=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const p=j.produce||{};console.log(new Date().toISOString().slice(11,19)+' '+j.status+' | '+(p.status||'-')+' '+(p.stage||'')+' '+(p.error?('ERR: '+p.error.slice(0,400)):'')+' '+(p.youtube?JSON.stringify(p.youtube):''))}catch(e){console.log('poll error')}})")
  echo "$LINE"
  case "$LINE" in *published*) exit 0;; *failed*) exit 2;; esac
  sleep 30
done
