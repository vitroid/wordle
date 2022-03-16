<script>
  import Letter from "./letter.svelte";
  import Unavail from "./unavail.svelte";
  import Confirm from "./confirm.svelte";

	export let guess;
	export let active;
</script>

<Unavail  active={active} />
{#each guess as L, i}
<Letter L={L} active={active} order={i}/>
{/each}
<Confirm  active={active} on:message /><br />