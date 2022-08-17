<script lang="ts">

	/**
	 * Page an invited user is directed to when they click on the link in the emailed invitation  
	 */

	import ExistingLogin from "./../components/invitation/Existing-Login.svelte"
	import NewRegistration from "./../components/invitation/New-Register.svelte"
	import { parseToken } from "./../lib/token"
	import Alert from "./../components/Alert.svelte"
	import type { SnackbarComponentDev } from '@smui/snackbar';
	import Footer from "./../components/Footer.svelte"
	import { STORE_newAlert } from '../stores';

	let snackbar: SnackbarComponentDev
	let alertText: string = ""
	let alertObject = null
	let alertClass: string = "dangerous"

	// Read token parameter from the URL
    export let params = {
        token: ''
    }
	let tokenJson

	$: if ($STORE_newAlert) {
		alertText = $STORE_newAlert.alertText
		alertObject = $STORE_newAlert.alertObject
		alertClass = $STORE_newAlert.alertClass
		snackbar.open()
		$STORE_newAlert = null
	}

	try {
		tokenJson = parseToken(params.token)
		if ( !tokenJson || !tokenJson.group || !tokenJson.group._id || (!tokenJson.email && !tokenJson._id) ) {
			console.error('Invalid invitation token. Missing parameters.')
			alertText = "Your authorization token is invalid."
			alertObject = null
			alertClass = "dangerous"
			snackbar.open()
		}
		tokenJson.token = params.token // Store the original token for passing to the acceptance API
	} catch (err) {
		console.error('Unable to process invitation.', err.toString())
		alertText = "Invitation error."
		alertObject = err
		alertClass = "dangerous"
		snackbar.open()
	}

</script>

<div class="page-wrapper">
	{#if tokenJson}
		<h1>
			{#if tokenJson.group.friend}
				YaMa Friend Request
			{:else}
				YaMa Group Invitation
			{/if}
		</h1>

		<div class="credentials-form">
				{#if tokenJson._id}
					<!-- Invitation is for a registered user - Login -->
					<ExistingLogin bind:tokenJson />
				{:else if tokenJson.email}
					<!-- Invitation is for a new user - Register -->
					<NewRegistration bind:tokenJson />
				{/if}
		</div>
	{:else}
		<div>Invalid token</div>
	{/if}
</div>

<Footer />

<Alert bind:alert={snackbar} alertText={alertText} alertObject={alertObject} alertClass={alertClass} />
