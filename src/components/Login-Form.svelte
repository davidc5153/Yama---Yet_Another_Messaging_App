<script lang="ts">
	import Textfield from '@smui/textfield';
  	import Icon from '@smui/textfield/icon';
    import ClearField from './Clear-Field.svelte';

    export let username:string
    export let password:string
	export let fixedUsername = false

</script>


<div>
    <Textfield variant="outlined" bind:value={username} input$autocomplete="email" label="Username / Email" required disabled={fixedUsername}>
        <Icon class="material-icons" slot="leadingIcon">account_circle</Icon>
        <ClearField slot="trailingIcon" bind:variable = {username} />
    </Textfield>
</div>
<div>
    <Textfield variant="outlined" bind:value={password} label="Password" type="password" required>
        <Icon class="material-icons" slot="leadingIcon">key</Icon>
        <ClearField slot="trailingIcon" bind:variable = {password} />
    </Textfield>
</div>

<style lang="scss">
	div {
		margin-bottom: 1rem;
	} 
	h1 {
		padding: 1rem;
	}
</style>