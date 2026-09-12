U=https://content-queen-production.up.railway.app
J=$(curl -s --max-time 30 -X POST "$U/demo/make-video" -H 'Content-Type: application/json' \
  -d '{"topic":"how do I handle an angry parent on the phone"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).jobId||'ERR'))")
echo "job $J"
echo "$J" > .jobid
for i in $(seq 1 45); do
  ST=$(curl -s --max-time 25 "$U/demo/make-video/$J" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).status)}catch(e){console.log('?')}})")
  case "$ST" in written) echo "SCRIPT READY"; break;; failed) echo "WRITE FAILED"; curl -s "$U/demo/make-video/$J"; exit 1;; esac
  sleep 20
done
curl -s --max-time 40 -X POST "$U/demo/make-video/$J/produce" > /dev/null
for i in $(seq 1 200); do
  R=$(curl -s --max-time 25 "$U/demo/make-video/$J")
  echo "$R" > .prod.json
  L=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const p=j.produce||{};console.log(new Date().toISOString().slice(11,19)+' '+j.status+' | '+(p.status||'-')+' '+(p.stage||'')+' '+(p.error?('ERR '+p.error.slice(0,350)):'')+' '+(p.youtube?JSON.stringify(p.youtube):''))}catch(e){console.log('poll error')}})")
  echo "$L"
  case "$L" in *published*) exit 0;; *"| failed"*) exit 2;; esac
  sleep 30
done
