<script>
  import Row from "./row.svelte";
	import {randomChoice, findCandidate, isFinished} from "./logic.svelte";
	import {words} from "./words.svelte";
	import { onMount } from 'svelte';

	export let guesses=[];
	let msg = "";
	
	onMount( () => {
		addItem(randomChoice(words.slice(0,1000)))
	});

	export function addItem(word){
		let l = guesses.length;
		guesses[l] = word;
	}
	
	function callback(){
		if ( isFinished() ){
			msg = "Well.done. Reload to start again."
		}
		else{
			let word = findCandidate();
			if ( word == "" ){
				msg="Give up!"
			}
			else{	
				addItem(word);
			}
		}
	}

	
</script>

{#each guesses as guess, i}
<Row guess={guess} on:message={callback} active={i == guesses.length - 1}  />
{/each}
<p>
	{msg}
</p>

