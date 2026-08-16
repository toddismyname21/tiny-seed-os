import * as F from '../src/lib/flex-order';
console.log('exports:', Object.keys(F).filter(k=>typeof (F as any)[k]==='function'));
const now=Date.now();
console.log('NOW =', new Date(now).toISOString(), '(server local:', new Date(now).toString().slice(0,33),')');
// try currentOrderWeek
try{ // @ts-ignore
  const w=(F as any).currentOrderWeek(now); console.log('currentOrderWeek(now) =', w);
  console.log('  isWindowOpen =', (F as any).isWindowOpen(w, now));
  console.log('  isPastCutoff =', (F as any).isPastCutoff(w, now));
  try{console.log('  closeLabel =', (F as any).closeLabel(w));}catch(e){}
  try{console.log('  windowLabels =', JSON.stringify((F as any).windowLabels(w, now)));}catch(e){}
}catch(e){console.log('currentOrderWeek err', String(e));}
// also test explicit weeks
for(const wk of ['2026-07-20','2026-07-27','2026-07-13']){
  try{ console.log(`week ${wk}: windowOpen=${(F as any).isWindowOpen(wk,now)} pastCutoff=${(F as any).isPastCutoff(wk,now)}`);}catch(e){console.log(wk,'err',String(e));}
}
