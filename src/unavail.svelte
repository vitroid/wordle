<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	export let active;

	function unavail() {
		dispatch('message', {
			text: 'unavail'
		});
	}

</script>

<button disabled={!active} on:click={unavail}>
	Unavailable
</button>

<style>
	button {
			background-color: #3A3A3C;
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
