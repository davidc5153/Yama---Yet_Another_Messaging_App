<script lang="ts">
	import Button, { Label } from "@smui/button";
	import RegisterForm from "./../RegisterForm.svelte"
	import Accept from "./Accept.svelte";
	import { STORE_newAlert } from './../../stores';

	export let tokenJson

	let registrationResponse
	let valid = false
	let done = false
	let fixedEmail = true

	if (tokenJson && tokenJson.name) {
		tokenJson.username = tokenJson.name.replace(/\s/g,'')
	}

	$: {
		if (registrationResponse) {
			if (registrationResponse._id && registrationResponse._id.length > 0) {
				valid = true
			} else {
				console.error('Validation error. Registration failed.')
				$STORE_newAlert = {
					alertText: "There has been error registoring your details.",
					alertObject: null,
					alertClass: "dangerous"
				}
			}
		} 
	}
</script>

{#if tokenJson && tokenJson.group && tokenJson.group.name && tokenJson.name && tokenJson.email}

	<h2>
		{#if tokenJson.group.friend}
			You have a friend invite from '{tokenJson.from}'
		{:else}
			You have an invited to join: {tokenJson.group.name}
		{/if}
	</h2>

	<!-- Registration -->
	<div class:hidden={valid}>
		<RegisterForm bind:registrationResponse bind:name={tokenJson.name} bind:email={tokenJson.email} bind:username={tokenJson.username} bind:fixedEmail/>
		<div>
			<Button color="primary" href="#/cancel/{tokenJson.token}" type="button">
				<Label>Cancel</Label>
			</Button>
		</div>	
	</div>
	<!-- Accept the invite -->
	<div class:hidden={!valid || done}>
		<h3>Accept the Invitation</h3>
		<p>You have been registered with YaMa.</p>
		<p>You will be sent an email containing a link that needs to be clicked to verify your email.</p>
		<p><span>By clicking the accept button, </span>
			{#if tokenJson.group.friend}
				<span>you will become friends with '{tokenJson.from}'.</span>
			{:else}
				<span>you will join the group: '{tokenJson.group.name}'.</span>
			{/if}
		</p>
		<br>
		<Accept bind:tokenJson bind:complete={done} />
		<div>
			<Button color="primary" href="#/cancel/{tokenJson.token}" type="button">
				<Label>Cancel</Label>
			</Button>
		</div>	
	</div>
	
	<div class:hidden={!(valid && done)}>
		<h3>Thank you</h3>
		{#if tokenJson.group.friend}
			<div>Your registration and friend acceptance has been processed.</div>
			<div>You are now registered in YaMa and a friend of '{tokenJson.from}'</div>
		{:else}
			<div>Your registration and invitation acceptance has been processed.</div>
			<div>You are now registered in YaMa and a member of the group: '{tokenJson.group.name}'</div>		
		{/if}
		<br/>
		<h3>Email Verification</h3>
		<p><span style="text-decoration: underline;">You will be sent an email containing a link that needs to be clicked to verify your email.</span></p>
		<p>Once your email is verified, you can <a href="/#/">login and start chatting on YaMa</a>.</p>
		<div>
			<Button color="primary" href="/#/" variant="raised" type="button">
				<Label>Login</Label>
			</Button>
		</div>	
	</div>
{:else}
	<div>
		<p>Invalid Invitation Token</p>
	</div>
{/if}

<style lang="scss">
	div {
		margin-bottom: 1rem;
	} 
</style>