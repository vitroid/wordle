<script>
	import { setState, setLetter } from "./logic.svelte";
	import { onMount } from 'svelte';


	export let L;
	export let active;
	export let order;
	let state = 0;
	const colors=["#444", "olive", "darkgreen"]
	let color = colors[0];
	
	function rotateState(){
		state = (state+1) % 3;
		color = colors[state];	
		// setLetter(order, L);
		// setState(order, state);
	}
	onMount( () => {
		setLetter(order, L);
		setState(order, state);
	});
	$: {
		setLetter(order, L);
		setState(order, state);
	}

</script>

<button disabled={!active} on:click={rotateState} style="--color: {color}">
	{L.toUpperCase()}
</button>

<style>
	button {
			background-color: var(--color);
			color: white;
			border: 0px;
			margin: 2px;
			font-weight: bold;
			font-size: 18pt;
			height: 50px;
			width: 50px;
			vertical-align: middle;
			text-align: center;
	}
	button:disabled {
		color: #888;
	}
</style>