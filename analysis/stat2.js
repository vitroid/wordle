//最初の候補を固定したらどうなるか。
//つまり、最初に決め打ちすべき語はあるかどうか。

import { words } from "../js/5letters.js";
import { trial, randomChoice, findCandidate } from "../js/wordle.js";

function trials(answer, firstcandid){

  let results = Array()
  let excluded = Array()
  
//   let candid = randomChoice( words.slice(1000) );
  let candid = firstcandid
  while ( 1 ){
    const hb = trial(answer, candid);
    // console.log(candid, hb);
    if ( hb[0] == candid ) break;
    results.push([candid, hb])
    candid = findCandidate(words, results, excluded)
  }
  
  return results
}


for(let k=0;k<1000;k++){
    const firstcandid = words[k]
    let sum = 0;
    for(let j=1000; j<2000; j++){
        const answer = words[j];
        sum += trials(answer, firstcandid).length;
    }
    const average = sum / 1000;
    console.log(average, firstcandid)
}
