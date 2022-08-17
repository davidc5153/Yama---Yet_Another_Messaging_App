<script lang="ts">
	import Footer from "../components/Footer.svelte"
	import Button, { Label } from '@smui/button';
	import Textfield from '@smui/textfield';
	import { validateEmail } from './../lib/validate' 
	import ApiRequest from '../lib/api';
	import ClearField from "../components/Clear-Field.svelte";
	import Alert from "./../components/Alert.svelte"
	import type { SnackbarComponentDev } from '@smui/snackbar';
	import CircularProgress from '@smui/circular-progress';

	let snackbar: SnackbarComponentDev
	let alertText: string = ""
	let alertObject = null
	let alertClass: string = "dangerous"
	let working = false

	export let params = {
        email: ''
    }

	let email = params.email
	let invalid = false
	checkEmail()
	if (invalid) { email = '' }
	let hidden = false 

	async function checkEmail() {
		try {
			invalid = !validateEmail(email)
		} catch (err) {
			console.error("Error checking email: ", err.toString())
			alertText = "Invalid email error."
			alertObject = err
			alertClass = "warning"
			snackbar.open()
		}
	}

	async function requestPasswordReset() {
		working = true
		checkEmail()
		if (!invalid) {
			try {
				let result = await ApiRequest.userPostReset(email)
				if (result && result.email == email) {
					console.info(result)
					hidden = true
				} else {
					console.error('Password reset error.')
					alertText = "There has been an error resetting your password."
					alertObject = null
					alertClass = "dangerous"
					snackbar.open()
				}
			} catch (err) {
				console.error("Password reset error: "+err.toString())
				alertText = "Password reset error."
				alertObject = err
				alertClass = "dangerous"
				snackbar.open()
			}
		}
		working = false
	}

</script>

<div class="page-wrapper" class:hidden={hidden}>
	<div><img src="/icons/logo-login.png" alt="Yama login logo" class="centre" width="128" height="87"/></div>
	<h1>Reset Password</h1>
	<form on:submit|preventDefault={requestPasswordReset}>
		<div>
			<Textfield variant="outlined" bind:value={email} label="Email Address" type="email" required >
				<ClearField slot="trailingIcon" bind:variable = {email} />
			</Textfield>
			<div id="email-error" class="input_error" class:invalid="{invalid}">Please enter a valid email address.</div>
		</div>
		<div class:hidden={working}>
			<Button color="primary" variant="raised" type="submit">
				<Label>Request Password Reset</Label>
			</Button>
		</div>
		<div class:hidden={!working}>
			<CircularProgress style="height: 32px; width: 32px;" indeterminate />
		</div>		
		<div>
			<Button color="primary" href="/#/" type="button">
				<Label>Cancel</Label>
			  </Button>
		</div>	
	</form>
</div>
<div class:hidden={!hidden}>
	<h3>Thank you</h3>
	<div>You have been emailed a link you can use to reset your password.</div>
	<br/>
	<div>Once you have reset your password, you can start chatting on <a href="#/chat/">YaMa</a></div>
</div>

<Footer/>

<Alert bind:alert={snackbar} alertText={alertText} alertObject={alertObject} alertClass={alertClass} />

<style lang="scss">
	div {
		margin-bottom: 1rem;
	} 
	h1 {
		padding: 1rem;
	}
</style>
