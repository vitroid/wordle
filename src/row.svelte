<script>
  import Letter from "./letter.svelte";
  import Unavail from "./unavail.svelte";
  import Confirm from "./confirm.svelte";

	export let guess;
	export let active;
</script>

{#if (active)}
<Unavail  active={active} on:message />
{/if}

{#each guess as L, i}
<Letter L={L} active={active} order={i}/>
{/each}

{#if (active)}
<Confirm  active={active} on:message />
{/if}

<br />
