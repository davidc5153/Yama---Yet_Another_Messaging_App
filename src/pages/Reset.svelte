<script lang="ts">
	import { parseToken, setToken } from "./../lib/token";
	import Button, { Group, Icon, Label } from "@smui/button";
    import { PASSWORD_MIN_LENGTH, validateEmail, validatePassword } from "../lib/validate"
	import Textfield from '@smui/textfield';
	import ApiRequest from "./../lib/api";
	import ClearField from "../components/Clear-Field.svelte";
	import Alert from "./../components/Alert.svelte"
	import type { SnackbarComponentDev } from '@smui/snackbar';
	import CircularProgress from '@smui/circular-progress';

	let snackbar: SnackbarComponentDev
	let alertText: string = ""
	let alertObject = null
	let alertClass: string = "dangerous"

    export let params = {
        token: ''
    }
	let hidden = false
	let username = ''
	let password = ''
	let confirmation = ''
	let tokenJson
	let invalidEmail = false
	let invalidPassword = false
	let invalidConfirmation = false
	let working = false

	try {
		tokenJson = parseToken(params.token)
		if ( !tokenJson || !tokenJson._id || !tokenJson.email || !tokenJson.name || !tokenJson.username ) {
			console.error('Invalid password reset token. Missing parameters.')
			throw "Missing parameters."
		}
		username = tokenJson.email
		checkEmail()
		if (invalidEmail) {
			throw "Invalid email address."
		}
	} catch (err) {
		console.error('Unable to process password reset request.', err.toString())
		alertText = "Password reset error."
		alertObject = err
		alertClass = "dangerous"
		snackbar.open()

	}
	
	async function checkEmail() {
		try {
			invalidEmail = !validateEmail(username)
		} catch (err) {
			console.error("Error checking email: ", err.toString())
			alertText = "Email validation error."
			alertObject = err
			alertClass = "dangerous"
			snackbar.open()
		}
	}
	
	function checkPassword() {
		invalidPassword = !validatePassword(password)
	}

	function checkConfirmation() {
		if (password === confirmation) {
			invalidConfirmation = false
		} else {
			invalidConfirmation = true
		}
	}

	async function changePassword() {
		working = true
		try {
			checkPassword()
			if (!invalidPassword) {
				checkConfirmation()
				if (!invalidConfirmation) {
					let response = await ApiRequest.userPatchPassword(tokenJson._id, username, password, params.token)
					await setToken(response, password)
					hidden = true
				}
			}
		} catch (err) {
			console.error("Error when attempting to update the password.", err.toString())
			alertText = "Password change error."
			alertObject = err
			alertClass = "dangerous"
			snackbar.open()
		}
		working = false
	}

</script>

<div class="page-wrapper">

	<div><img src="/icons/logo-login.png" alt="Yama login logo" class="centre" width="128" height="87" style="margin-top: 1rem;"/></div>
	<h1>Set New Password</h1>
	<h2>For {tokenJson.name} ({tokenJson.username})</h2>
	<br/>
	<div class:hidden>	
		<form on:submit|preventDefault={changePassword}>
			<div>
				<div>
					<Textfield variant="outlined" bind:value={username} label="Username / Email" required disabled></Textfield>
				</div>
				<div>			
					<Textfield class="password-field" variant="outlined" bind:value={password} label="Password" type="password" required on:blur={checkPassword}>
						<ClearField slot="trailingIcon" bind:variable = {password} />
					</Textfield>
				</div>
				<div id="password-error" class="input_error" class:invalid="{invalidPassword}">
					Passwords must have at least {PASSWORD_MIN_LENGTH} characters. <br>Please use lower-case and upper-case characters, <br>numbers, and special characters.
				</div>
				<div>
					<Textfield class="password-field" variant="outlined" bind:value={confirmation} label="Confirm" type="password" required on:blur={checkConfirmation}>
						<ClearField slot="trailingIcon" bind:variable = {confirmation} />
					</Textfield>
				</div>
				<div id="confirmation-error" class="input_error" class:invalid="{invalidConfirmation}">The entered passwords do not match.</div>
			</div>
			<div class:hidden={working}>
				<Button color="primary" variant="raised" type="submit">
					<Label>Change Password</Label>
				</Button>
			</div>
			<div class:hidden={!working}>
				<CircularProgress style="height: 32px; width: 32px;" indeterminate />
			</div>			
			<div>
				<Button color="primary" href="#/chat/" type="button">
					<Label>Cancel</Label>
				</Button>
			</div>
		</form>
	</div>

	<div class:hidden={!hidden}>
		<h3>Thank you</h3>
		<div>Your password has been reset.</div>
		<br/>
		<div>Start chatting now on <a href="#/chat/">YaMa</a></div>
	</div>

</div>

<Alert bind:alert={snackbar} alertText={alertText} alertObject={alertObject} alertClass={alertClass} />

<style lang="scss">
	div {
		margin-bottom: 1rem;
	} 
</style>