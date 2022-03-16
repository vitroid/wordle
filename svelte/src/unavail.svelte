<script>
	export let active;
</script>

<button disabled={!active}>
	Unavailable
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
