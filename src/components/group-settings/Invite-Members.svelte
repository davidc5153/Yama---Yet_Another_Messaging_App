<script lang="ts">
    import Button, { Icon, Label } from '@smui/button';
    import Textfield from '@smui/textfield';
    import { validateEmail } from "./../../lib/validate"
    import ApiRequest from "./../../lib/api"
    import Chat from "./../Chat.svelte"
    import Friends from "./../Friends.svelte"
    import GroupSettings from "../Group-Settings.svelte";
    import ClearField from '../Clear-Field.svelte';
    import { STORE_chatPanelOpen, STORE_showingFriends, STORE_newAlert } from '../../stores';
    import CircularProgress from '@smui/circular-progress';

    export let selectedGroup
    export let chatScreenComponent

    let email=""
    let name = ""
    let message = ""
    let invalidEmail = false;

    let heading
    let returnScreen
    let submitText
    let working = false

    if (!$STORE_showingFriends || (selectedGroup && !selectedGroup.friend)) {
        heading = "Invite a new member to the group"
        submitText = "Invite New Member"
        returnScreen = Chat
    } else {
        heading =  "Invite a new friend"
        submitText = "Invite Friend"
        returnScreen = Friends
    }

	async function checkEmail() {
		try {
			invalidEmail = !validateEmail(email)
		} catch (err) {
			console.error("Error checking email: ", err.toString())
            $STORE_newAlert = {
                alertText: "Email validation error.",
                alertObject: err,
                alertClass: "dangerous"
            }
		}
	}

    async function sendInvite(event) {
        working = true
        try {
            checkEmail()
            if (!invalidEmail) {
                let invite
                if (!$STORE_showingFriends || (selectedGroup && selectedGroup.friend !== true)) {
                    invite = await ApiRequest.inviteToGroup(selectedGroup._id, email, name, message)
                } else {
                    // Friend request
                    invite = await ApiRequest.inviteToGroup(null, email, name, message)
                }
                if (invite && invite.token) {
                    console.info("Invite MessageId: ", invite.MessageId)
                    console.info("Invite Token: ", invite.token)
                    email=""
                    name = ""
                    message = ""
                    $STORE_newAlert = {
                        alertText: "The invitation has been sent.",
                        alertObject: null,
                        alertClass: "info"
                    }
                } else {
                    console.error("Error sending invite. Missing invite messageid or token.")
                    $STORE_newAlert = {
                        alertText: "Invalid invitation token.",
                        alertObject: null,
                        alertClass: "dangerous"
                    }
                }
                chatScreenComponent = returnScreen
            }
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Invitation send error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }

</script>

<h2>{heading}</h2>
<form on:submit|preventDefault={sendInvite}>
    <div>
        <Textfield variant="outlined" bind:value={email} label="New user's email address" type="email" required on:blur={checkEmail}>
			<ClearField slot="trailingIcon" bind:variable = {email} />
        </Textfield>
        <div id="email-error" class="input_error" class:invalid="{invalidEmail}">Please enter a valid email address.</div>
    </div>
    <div>
        <Textfield variant="outlined" bind:value={name} label="New user's name" type="text">
			<ClearField slot="trailingIcon" bind:variable = {name} />
        </Textfield>
    </div>
    <div>
        <Textfield variant="outlined" bind:value={message} label="Message to new user" type="text">
			<ClearField slot="trailingIcon" bind:variable = {message} />
        </Textfield>
    </div>
    <div class:hidden={working} >
        <Button color="primary" variant="raised" type="submit">
            <Label>{submitText}</Label>
        </Button>
    </div>
    <div class:hidden={!working}>
        <CircularProgress style="height: 32px; width: 32px;" indeterminate />
    </div>
    <div>
        <Button color="primary" on:click={() => {
            if (selectedGroup && !selectedGroup.friend) {
                chatScreenComponent = Chat; 
            } else {
                chatScreenComponent = Friends;
                $STORE_chatPanelOpen = false
            }
        }} type="button">
            <Label>Back</Label>
    	</Button>
    </div>
</form>

<style lang="scss">
	div {
		margin-bottom: 1rem;
	} 
</style>

