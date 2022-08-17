<script lang="ts">
    import Snackbar, { Actions, Label } from '@smui/snackbar';
	import type { SnackbarComponentDev } from '@smui/snackbar';
	import IconButton from "@smui/icon-button";
    import Fab, { Icon } from '@smui/fab';

    export let alert: SnackbarComponentDev
    export let alertText: string = ""
    export let alertObject = null
    export let alertClass: string = "info"  // "info", "warning" or "dangerous"

</script>

<Snackbar bind:this={alert}>
    <Label class={alertClass}>
        <Fab color="primary" mini><Icon class="material-icons">{alertClass}</Icon></Fab>
	    <span class="alertText">
            {alertText}
            {#if alertObject}
                {#if alertObject.error}
                    {alertObject.error}
                {:else if alertObject.message}
                    {alertObject.message}
                {/if}
            {/if}
        </span>
    </Label>
	<Actions>
	  <IconButton class="material-icons" title="Dismiss">close</IconButton>
	</Actions>
</Snackbar>
