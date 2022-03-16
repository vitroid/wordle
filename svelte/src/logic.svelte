<script context="module">
	import { words } from "./words.svelte";

	let wordHistory = [];
	let stateHistory = [];
	let currentWord = ["","","","",""];
	let currentState = [0,0,0,0,0];
	let excluded = [];
	
	export function isFinished(){
		let l = stateHistory.length;
		console.log(stateHistory[l-1][0])
		return ! stateHistory[l-1][0].includes(".")
	}
	
	export function setLetter(order, letter){
		currentWord[order] = letter;
	}
	
	export function setState(order, state){
		currentState[order] = state;
	}

	function organizeState(word, state){
		var hit = "";
		var blow = {};
		for(let i=0; i<5; i++){
			if ( state[i] == 2){
				hit += word[i];
			}
			else{
				hit += ".";
			}
			if ( state[i] != 0){
				blow[word[i]] = 1;
			}
		}
		var b = "";
		Object.keys(blow).sort().forEach(function (key) {
				b += key;
		})
		console.log(hit, b)
		return [hit, b];
	}

	export function record(){
		let word = currentWord.join("");
		let state = organizeState(word, currentState);
		wordHistory.push(word);
		stateHistory.push(state);
	}
	
	function irand(n=10) {
		return Math.floor(Math.random() * n);
	}

	export function randomChoice(arr) {
		return arr[irand(arr.length)];
	}

	function trial(answer, word){
		var hit = "";
		var blow = {};
		for(let i=0; i<5; i++){
			if (answer[i] == word[i]){
				hit += word[i];
			}
			else{
				hit += ".";
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
	
	export function findCandidate(){
		for(let i=0;i<words.length; i++){
			let w = words[i];

			if ( excluded.indexOf(w) >= 0 ){
				continue;
			}
			let fail=false;

			for(let j=0;j<wordHistory.length; j++){
				const hb = stateHistory[j];
				const hb2 = trial(w, wordHistory[j]);
// 				console.log(w, hb2[0], hb2[1])
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
		console.log("GiveUp in finding candidates.")
		return "";
	}
</script>