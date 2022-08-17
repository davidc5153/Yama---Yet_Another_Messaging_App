<script lang="ts">

	/**
	 * Registration Page - Allows the user to sign up to YaMa  
	 */

	import RegisterForm from '../components/RegisterForm.svelte';
	import Footer from "../components/Footer.svelte"
	import { validToken } from "./../lib/token"
	import {push} from 'svelte-spa-router'
	import Button, { Label } from '@smui/button';
	import Alert from "./../components/Alert.svelte"
	import type { SnackbarComponentDev } from '@smui/snackbar';
	import { STORE_newAlert } from '../stores';

	let snackbar: SnackbarComponentDev
	let alertText: string = ""
	let alertObject = null
	let alertClass: string = "dangerous"

	export let registrationResponse

	let hidden = false

	if (validToken(localStorage.getItem("token"))) {
		// Already logged in - Redirect to chat page
		push('/chat/')
	}

	$: if ($STORE_newAlert) {
        alertText = $STORE_newAlert.alertText
        alertObject = $STORE_newAlert.alertObject
        alertClass = $STORE_newAlert.alertClass
        snackbar.open()
        $STORE_newAlert = null
    }

	$: {
		if (registrationResponse) {
			if (registrationResponse._id && registrationResponse._id.length > 0) {
				hidden = true
			} else {
				console.error('Validation error. Registration failed.')
				alertText = "There has been an error attempting to register your details."
				alertObject = null
				alertClass = "dangerous"
				snackbar.open()
			}
		} 
	}
</script>

<div class = "page-wrapper" class:hidden >
	<RegisterForm redirect={null} bind:registrationResponse fixedEmail={false} name='' email='' username=''/>
	<div>
		<Button color="primary" href="/#/" type="button">
			<Label>Cancel</Label>
		  </Button>
	</div>
</div>

<div class = "page-wrapper" class:hidden={!hidden} >
	<h1>Email Verification</h1>
	<p>You will be sent an email containing a Link that needs to be clicked to verify your email.</p>
	<p>Once your email is verified, you can <a href="/#/">login and start chatting on YaMa</a>.</p>
</div> 

<Footer/>

<Alert bind:alert={snackbar} alertText={alertText} alertObject={alertObject} alertClass={alertClass} />

<style lang="scss">
	* :global(label.mdc-text-field) {
		width: 260px;
	}

</style>