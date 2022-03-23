import { words } from "./5letters.js";
import { makeRecord, trial, findCandidate, randomChoice } from "./wordle.js"

function gid(id){
  return document.getElementById(id);
}

var rows = 0;
var buttonStates = [0,0,0,0,0]; //0=miss, 1=blow, 2=hit
const buttonColors = {0: "#444", 1:"olive", 2:"darkgreen"};
var word = randomChoice(words);
var results = [];
var excluded = [];


function rotate(ev){
  // rotate the state
  id = ev.target.id
  order = id[2]
  buttonStates[order] += 1;
  buttonStates[order] %= 3;
  ev.target.style.backgroundColor = buttonColors[buttonStates[order]];
}

function resetRow(){
  buttonStates = [0,0,0,0,0];
  gid("memo").innerHTML += word + " ";
  excluded.push(word);

  word = findCandidate(results);
  for (var i=0; i<5; i++) {
    id = "c"+rows+i;
    gid(id).style.backgroundColor = buttonColors[buttonStates[i]];
    gid(id).innerHTML = word[i].toUpperCase();
  }

}

function addRow()
{
  var s = "";
  var id = "undef"+rows;
  s += "<button class='ctl' id='"+id+"'>unavailable</button>";
  for (var i=0; i<5; i++) {
    id = "c"+rows+i;
    s += "<button id='"+id+"'>"+word[i].toUpperCase()+"</button>";
  }
  var id = "set"+rows;
  s += "<button class='ctl' id='"+id+"'>SET</button><br />";

  gid("board").innerHTML += s;

  var id = "undef"+rows;
  gid(id).onclick=resetRow;
  for (let i=0; i<5; i++) {
    id = "c"+rows+i;
    gid(id).onclick=rotate;
  }
  var id = "set"+rows;
  gid(id).onclick=nextRow;
}

function inactivate1(el){
  el.onclick = "#";
  el.style.color = "black";
  el.disabled = true;
}

function inactivate(row){
  inactivate1(gid("undef"+row));
  for (var i=0; i<5; i++) {
    inactivate1(gid("c"+row+i));
  }
  inactivate1(gid("set"+row));
}



function nextRow(){
  var match = true;
  for (var i=0; i<5; i++) {
    if (buttonStates[i] != 2){
      match = false;
    }
  }
  results.push([word, makeRecord(word, buttonStates)]);
  console.log(results);
  inactivate(rows);
  if (match) {
    gid("msg").innerHTML = "Congrats! Reload to start again.";
    var unavail = gid("memo").innerHTML;
    if (unavail.length > 0){
      gid("memo").innerHTML = "<a href='mailto:vitroid+wordle@gmail.com?body="+escape(unavail)+"&subject="+escape("Unavailable words")+"'>Report these unavailable words to improve the dictionary of the wordle solver: <span>"+unavail+"</span></a>";
    }
    return;
  }
  buttonStates = [0,0,0,0,0];
  word = findCandidate(results);
  rows += 1;
  addRow();
}
console.log(trial("slate", "least"))
addRow();
