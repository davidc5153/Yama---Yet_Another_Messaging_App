<script lang="ts">
	import Button, { Label } from "@smui/button";
	import ApiRequest from "../../lib/api";
	import { setToken } from "../../lib/token";
	import LoginForm from "./../../components/Login-Form.svelte"
	import Accept from "./Accept.svelte";
	import { STORE_newAlert } from './../../stores';
	import CircularProgress from '@smui/circular-progress';

	export let tokenJson
	
	let username = tokenJson.username
	let password = ""
	let validated = false
	let complete = false
	let working = false

	async function confirmCredentials() {
		working = true
		if (username && password) {
			try {
				let validUser = await ApiRequest.userPostLogin(username, password)
				if (validUser && validUser._id && validUser._id === tokenJson._id) {
					console.info("User authenticated")
					validated = true
					await setToken(validUser, password)
					$STORE_newAlert = {
						alertText: "Credential confirmation successfull.",
						alertObject: null,
						alertClass: "info"
					}
				} else {
					console.warn("User failed validation.")
					$STORE_newAlert = {
						alertText: "Unable to login with the supplied credentials.",
						alertObject: null,
						alertClass: "dangerous"
					}
				}
			} catch (err) {
				console.error(err)
				$STORE_newAlert = {
					alertText: "Login error.",
					alertObject: err,
					alertClass: "dangerous"
				}
			}
		}
		working = false
	}

</script>

<h2>
	{#if tokenJson.group.friend}
		You have a friend request from '{tokenJson.from}'  
	{:else}
		You have an invite to join: {tokenJson.group.name}
	{/if}
</h2>

<div class:hidden={validated}>
	<div><img src="/icons/logo-login.png" alt="Yama login logo" class="centre" width="128" height="87"/></div>
	<h1>Login</h1>
	<form on:submit|preventDefault={confirmCredentials}>
		<LoginForm bind:username bind:password fixedUsername={true}/>
		<div class:hidden={working}>
			<Button color="primary" variant="raised" type="submit">
				<Label>Confirm Credentials</Label>
			</Button>
		</div>
		<div class:hidden={!working}>
			<CircularProgress style="height: 32px; width: 32px;" indeterminate />
		</div>
		<div>
			<Button color="primary" href="#/cancel/{tokenJson.token}" type="button">
				<Label>Cancel</Label>
			</Button>
		</div>
	</form>
</div>

<div class:hidden={!validated || complete}>
	<h3>Accept the Invitation</h3>
	<Accept bind:tokenJson bind:complete />
	<div>
		<Button color="primary" href="#/cancel/{tokenJson.token}" type="button">
			<Label>Cancel</Label>
		</Button>
	</div>	
</div>

<div class:hidden={!(validated && complete)}>
	<h3>Thank you</h3>
	{#if tokenJson.group.friend}
		<div>Your friend acceptance has been processed.</div>
		<div>You are now friends with '{tokenJson.from}'</div>
	{:else}
		<div>Your invitation acceptance has been processed.</div>
		<div>You are now a member of the group: {tokenJson.group.name}</div>
	{/if}
	<br/>
	<div>Start chatting on <a href="#/chat/">YaMa</a></div>
</div>

<style lang="scss">
	div, button {
		margin-bottom: 1rem;
	} 
</style>