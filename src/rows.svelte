<script>
	import Row from "./row.svelte";
	import {randomChoice, findCandidate, excludeWord} from "./logic.svelte";
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
	
	function callback(event){
		switch ( event.detail.text ){
			case "unavail":
				excludeWord();
				guesses.pop();
				console.log("Delete")
				break;
			case "finished":
				msg = "Well.done. Reload to start again."
				return;
		}
		let word = findCandidate();
		if ( word == "" ){
			msg="Give up!"
		}
		else{	
			addItem(word);
			console.log("Add", word)
		}
	}

	
</script>

{#each guesses as guess, i}
<Row guess={guess} on:message={callback} active={i == guesses.length - 1}  />
{/each}
<p>
	{msg}
</p>

