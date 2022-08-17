<script lang="ts">
	/**
	 * Main page for login to YaMa 
	 */

	import LoginForm from "./../components/Login-Form.svelte"
	import Footer from "../components/Footer.svelte"
	import Button, { Label } from '@smui/button';
	import { setToken, validToken, clearToken } from './../lib/token'
	import ApiRequest from '../lib/api';
	import {push} from 'svelte-spa-router'
	import Alert from "./../components/Alert.svelte"
	import type { SnackbarComponentDev } from '@smui/snackbar';
	import CircularProgress from '@smui/circular-progress';
	import { STORE_loggedIn } from "../stores";


	let username = ''
	let password = ''
	let snackbar: SnackbarComponentDev
	let alertText: string = ""
	let alertObject = null
	let alertClass: string = "dangerous"
	
	let loggingIn = false
	let token = localStorage.getItem("token")
	if ( token && token!="null" && validToken(token)) {
		$STORE_loggedIn = true
	}

	function gotoChat() {
		push("/chat/")
	}

	function logout() {
		clearToken()
		$STORE_loggedIn = false
	}

	async function login() {
		if (!$STORE_loggedIn) {
			if (username && password) {
				try {
					loggingIn = true
					let response = await ApiRequest.userPostLogin(username, password)
					await setToken(response, password)
					$STORE_loggedIn = true
					push('/chat/')
				} catch (err) {
					console.error(err)
					alertText = "Login error."
					alertObject = err
					alertClass = "dangerous"
					snackbar.open()
				}
			}
		} else {
			console.warn('User already logged in')
			alertText = "You are already logged in."
			alertObject = null
			alertClass = "warning"
			snackbar.open()
		}
		loggingIn = false
	}


</script>


<div class="page-wrapper">
	{#if !$STORE_loggedIn}
		<div><img src="/icons/logo-login.png" alt="Yama login logo" class="centre" width="128" height="87"/></div>
		<h1>Login</h1>
		<form on:submit|preventDefault={login}>
			<LoginForm bind:username={username} bind:password={password} fixedUsername={false} />
			<div class:hidden={loggingIn}>
				<a href="#/forgotten/{username}">Reset forgotten password</a>
			</div>			
			<div class:hidden={loggingIn}>
				<Button color="primary" variant="raised" type="submit">
					<Label>Login</Label>
				</Button>
			</div>
			<div class:hidden={loggingIn}>
				<Button color="primary" href="#/register" type="button">
					<Label>Create Account</Label>
				</Button>
			</div>
			<div class:hidden={!loggingIn}>
				<CircularProgress style="height: 32px; width: 32px;" indeterminate />
			</div>
		</form>

	{:else}
		<div><img src="/icons/logo-login.png" alt="Yama login logo" class="centre" width="128" height="87"/></div>
		<h1>Logged In</h1>
		<div>
			<p>You are already logged in as "{localStorage.getItem("username")}".</p>
		</div>
		<div>
			<Button color="primary" variant="raised" on:click={logout} type="button">
				<Label>Logout</Label>
			</Button>
		</div>
		<div>
			<Button color="primary" variant="raised" on:click={gotoChat} type="button">
				<Label>Start Chatting</Label>
			</Button>
		</div>
		
	{/if}
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
	* :global(button.mdc-button) {
        min-width: 15em;
	}
</style>
