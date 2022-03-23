export function makeRecord(word, buttonStates){
  var hit = "";
  var blow = {};
  for(let i=0; i<5; i++){
    if ( buttonStates[i] == 2){
      hit += word[i];
    }
    else{
      hit += " ";
    }
    if ( buttonStates[i] != 0){
      blow[word[i]] = 1;
    }
  }
  var b = "";
  Object.keys(blow).sort().forEach(function (key) {
      b += key;
  })
  return [hit, b];
}

export function trial(answer, word){
  var hit = "";
  var blow = {};
  for(let i=0; i<5; i++){
    if (answer[i] == word[i]){
      hit += word[i];
    }
    else{
      hit += " ";
    }
    if (answer.includes(word[i])){
      blow[word[i]] = 1;
    }
  }
  var b = "";
  Object.keys(blow).sort().forEach(function (key) {
      b += key;
  })
  return [hit, b];
}

export function isIdentical(s,t){
  // compare two sets
  Object.keys(hash).forEach(function (key) {
      var value = hash[key]
      // iteration code
  })
}

export function findCandidate(words, results, excluded){
  var w;
  for(var i=0;i<words.length; i++){
    w = words[i];
    if ( excluded.indexOf(w) >= 0 ){
      continue;
    }
    var fail=false;
    for(var j=0;j<results.length; j++){
      const hb = results[j][1];
      const hb2 = trial(w, results[j][0]);
      // console.log(w, hb2[0], hb2[1])
      if ((hb[0] === hb2[0])&&(hb[1] === hb2[1])){
      }
      else{
        fail = true;
      }
    }
    if ( ! fail ){
      return w;
    }
  }
}

export function irand(n=10) {
  return Math.floor(Math.random() * n);
}

export function randomChoice(arr) {
  return arr[irand(arr.length)];
}

