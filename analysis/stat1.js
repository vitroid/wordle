//推測しやすい語、しにくい語をさがす。
//第一候補をリストの最初の1000語のなかからさがしているので、正解は必ずそこに含まれないように1001語目以降から選んでいる。=一発正解はありえない。

import { words } from "../js/5letters.js";
import { trial, randomChoice, findCandidate } from "../js/wordle.js";

function trials(answer){

  let results = Array()
  let excluded = Array()
  
  let candid = randomChoice( words.slice(1000) );
  while ( 1 ){
    const hb = trial(answer, candid);
    // console.log(candid, hb);
    if ( hb[0] == candid ) break;
    results.push([candid, hb])
    candid = findCandidate(words, results, excluded)
  }
  
  return results
}


for(let j=1000; j<2000; j++){
  const answer = words[j];
  let sum = 0;
  const N=10000;
  for(let i=0; i<N; i++){
    sum += trials(answer).length;
  }
  const average = sum / N;
  console.log(average, answer)
}
