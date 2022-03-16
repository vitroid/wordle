<script>
	import { record } from "./logic.svelte";
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	export let active;
	
	function nextLine() {
		dispatch('message', {
			text: 'Hello!'
		});
	}

	function confirm(){
		record();
		nextLine();
	}
</script>

<button on:click={confirm} disabled={!active}>
	Confitm
</button>

<style>
	button {
			background-color: #444;
			color: white;
			border: 0px;
			margin: 2px;
			font-weight: bold;
			font-size: 12pt;
			height: 50px;
			width: 100px;
			vertical-align: middle;
			text-align: center;
	}
	button:disabled {
		color: #888;
	}
</style>
