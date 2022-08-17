<script lang="ts">
	import ApiRequest from "./../lib/api"
	import {push} from 'svelte-spa-router'
	import Button, { Group, Label } from '@smui/button';
	import Textfield from '@smui/textfield';
    import { USERNAME_MIN_LENGTH, PASSWORD_MIN_LENGTH, validateEmail, validateUsername, existingUsername, validatePassword, validateDOB, validatePhone } from "../lib/validate"
	import YamaEncryption from "../lib/encryption";
	import ClearField from "./Clear-Field.svelte";
	import { STORE_newAlert } from '../stores';
	import CircularProgress from '@smui/circular-progress';

	export let redirect:string|null = null
	export let registrationResponse
	export let fixedEmail = false
    export let name:string = ''
	export let email:string = ''
	export let username:string = ''

	let dateString:string = ''
	let phone:string = ''
	let password:string = ''
	let confirmation:string = ''

	let invalidName = false;
	let invalidDOB = false;
	let invalidPhone = false;
	let invalidEmail = false;
	let duplicateEmail = false;
	let invalidUsername = false;
	let duplicateUsername = false;	
	let invalidPassword = false;
	let invalidConfirmation = false;
	let working = false

	async function checkUsername() {
		try{
			duplicateUsername = false;
			invalidUsername = !validateUsername(username)
			if (!invalidUsername) {
				duplicateUsername = await existingUsername(username)
			}
		} catch (err) {
			console.error("Error checking username: ", err.toString())
			$STORE_newAlert = {
				alertText: "Username validation error.",
				alertObject: err,
				alertClass: "dangerous"
			}
		}
	}

	async function checkEmail() {
		try {
			duplicateEmail = false;
			invalidEmail = !validateEmail(email)
			if (!invalidEmail) {
				duplicateEmail = await existingUsername(email)
			}
		} catch (err) {
			console.error("Error checking email: ", err.toString())
			$STORE_newAlert = {
				alertText: "Email validation error.",
				alertObject: err,
				alertClass: "dangerous"
			}
		}
	}
	
	function checkPassword() {
		invalidPassword = !validatePassword(password)
	}

	function checkDOB() {
		try {
			invalidDOB = !validateDOB(dateString);
		} catch (err) {
			console.error("Error checking date: " + err)
			invalidDOB = true
		}
	}

	function checkConfirmation() {
		if (password === confirmation) {
			invalidConfirmation = false
		} else {
			invalidConfirmation = true
		}
	}

	function checkPhone() {
		try {
			invalidPhone = !validatePhone(phone);
		} catch (err) {
			console.error("Error checking phone number: " + err)
			invalidPhone = true
		}
	}

	async function generateUserKeys() {
		return await YamaEncryption.generateKeyPair()
	}

	async function register() {
		working = true
		try {
			await checkUsername()
			await checkEmail()
			checkPhone()
			checkDOB()
			checkPassword()
			checkConfirmation()
			let date:Date = new Date(dateString)
			
			if (!invalidEmail && !duplicateEmail && !invalidUsername && !duplicateUsername && !invalidName && !invalidPhone && !invalidPassword && !invalidConfirmation && !invalidDOB) {
				// Generate Keys used for E2E encryption
				const userKeys = await generateUserKeys()
				// Encrypt private key with user password
				const privKey = await YamaEncryption.encryptWithString(JSON.stringify(userKeys.privateKey), password);
				// register the user in the database
				registrationResponse = await ApiRequest.userPostRegister(username, email, name, phone, password, date, userKeys.publicKey, privKey);
				if (registrationResponse && registrationResponse._id) {
					// await setToken(registrationResponse, password) // User is no longer logged in after registration 
					if (redirect) {
						push(redirect)
					}					
				} else {
					throw "Invalid registration responce"
				}
			}
		} catch (err) {
			console.error("Error trying to register user.", err)
			$STORE_newAlert = {
				alertText: "Registration error.",
				alertObject: err,
				alertClass: "dangerous"
			}
		}
		working = false
	}

</script>

<div><img src="/icons/logo-login.png" alt="Yama login logo" class="centre" width="128" height="87"/></div>
<h1>Create Account</h1>
<form on:submit|preventDefault={register}>
	<div>
		<Textfield variant="outlined" bind:value={name} label="Name" type="text" style="width: 260px;">
			<ClearField slot="trailingIcon" bind:variable = {name} />
		</Textfield>
		<div id="name-error" class="input_error" class:invalid="{invalidName}">Invalid name.</div>
	</div>
	<div>
		<Textfield variant="outlined" bind:value={dateString} label="Date of Birth" on:blur={checkDOB} type="date" style="width: 260px;">
			<ClearField slot="trailingIcon" bind:variable = {dateString} />
		</Textfield>
		<div id="dob-error" class="input_error" class:invalid="{invalidDOB}">Invalid date of birth.</div>
	</div>
	<div>
		<Textfield variant="outlined" bind:value={phone} label="Phone" type="tel" style="width: 260px;">
			<ClearField slot="trailingIcon" bind:variable = {phone} />
		</Textfield>
		<div id="phone-error" class="input_error" class:invalid="{invalidPhone}">Invalid phone number.</div>
	</div>
	<div>
		<Textfield variant="outlined" bind:value={email} label="Email Address" type="email" required on:blur={checkEmail} disabled={fixedEmail} style="width: 260px;">
			<ClearField slot="trailingIcon" bind:variable = {email} />
		</Textfield>
		<div id="email-error" class="input_error" class:invalid="{invalidEmail}">Please enter a valid email address.</div>
		<div id="email-exists" class="input_error" class:invalid="{duplicateEmail}">The email address is already registered.</div>
	</div>
	<div>
		<Textfield variant="outlined" bind:value={username} label="Enter your username" type="text" required on:blur={checkUsername} style="width: 260px;">
			<ClearField slot="trailingIcon" bind:variable = {username} />
		</Textfield>
		<div id="username-error" class="input_error" class:invalid="{invalidUsername}">
			Usernames must have at least {USERNAME_MIN_LENGTH} characters <br> and contain no spaces or the '@' symbol.</div>
		<div id="username-exists" class="input_error" class:invalid="{duplicateUsername}">This username is already taken.</div>
	</div>
	<div>
		<Textfield class="password-field" variant="outlined" bind:value={password} label="Password" type="password" required on:blur={checkPassword} style="width: 260px;">
			<ClearField slot="trailingIcon" bind:variable = {password} />
		</Textfield>
		<div id="password-error" class="input_error" class:invalid="{invalidPassword}">
			Passwords must have at least {PASSWORD_MIN_LENGTH} characters. <br>Please use lower-case and upper-case characters, <br>numbers, and special characters.
		</div>
	</div>
	<div>
		<Textfield class="password-field" variant="outlined" bind:value={confirmation} label="Confirm" type="password" required on:blur={checkConfirmation} style="width: 260px;">
			<ClearField slot="trailingIcon" bind:variable = {confirmation} />
		</Textfield>
		<div id="confirmation-error" class="input_error" class:invalid="{invalidConfirmation}">The entered passwords do not match.</div>
	</div>
	<div class:hidden={working}>
		<Button color="primary" variant="raised" type="submit">
			<Label>Submit</Label>
		</Button>
	</div>
	<div class:hidden={!working}>
		<CircularProgress style="height: 32px; width: 32px;" indeterminate />
	</div>
</form>

<style lang="scss">
	div {
		margin-bottom: 1rem;
	} 
	h1 {
		padding: 1rem;
	}
</style>
