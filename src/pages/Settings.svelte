<script lang="ts">
    import Footer from "../components/Footer.svelte";
    import Button, { Label } from "@smui/button";
    import ApiRequest from "../lib/api";
    import { push } from "svelte-spa-router";
    import LoginForm from "../components/Login-Form.svelte";
    import Username from "../components/user-settings/Username.svelte"
    import Email from "../components/user-settings/Email.svelte"
    import Password from "../components/user-settings/Password.svelte";
    import EditAvatar from "../components/user-settings/Edit-Avatar.svelte";
    import Phone from "../components/user-settings/Phone.svelte";
    import Name from  "../components/user-settings/Name.svelte";
    import Alert from "./../components/Alert.svelte"
    import type { SnackbarComponentDev } from '@smui/snackbar';
    import { STORE_newAlert } from "../stores";
    import CircularProgress from '@smui/circular-progress';

    let snackbar: SnackbarComponentDev
    let alertText: string = ""
    let alertObject = null
    let alertClass: string = "dangerous"

    let _id: string = localStorage.getItem("_id")
    let username: string = localStorage.getItem("username")
    let oldPassword: string = "";
    let hideSettings = true;
    let working = false

    async function confirmCredentials() {
        working = true
		if (username && oldPassword) {
			try {
				let validUser = await ApiRequest.userPostValidate(username, oldPassword)
				if (validUser && validUser._id && validUser._id === _id) {
					console.info("User authenticated")
                    hideSettings = false
				} else {
					console.warn("User failed validation.")
                    alertText = "Invalid password."
                    alertObject = null
                    alertClass = "dangerous"
                    snackbar.open()
				}
			} catch (err) {
				console.error(err)
                alertText = "Password validation error."
                alertObject = err
                alertClass = "dangerous"
                snackbar.open()
			}
		}
        working = false
	}

    $: if ($STORE_newAlert) {
        alertText = $STORE_newAlert.alertText
        alertObject = $STORE_newAlert.alertObject
        alertClass = $STORE_newAlert.alertClass
        snackbar.open()
        $STORE_newAlert = null
    }

</script>

<div  class="page-wrapper" class:hidesettings={!hideSettings}>
	<div><img src="/icons/logo-login.png" alt="Yama login logo" class="centre" width="128" height="87"/></div>
	<h1>Confirm Password</h1>
	<form on:submit|preventDefault={confirmCredentials}>
		<LoginForm bind:username bind:password={oldPassword} fixedUsername={true}/>
		<div class:hidden={working}>
			<Button color="primary" variant="raised" type="submit">
				<Label>Confirm Credentials</Label>
			</Button>
		</div>
        <div class:hidden={!working}>
            <CircularProgress style="height: 32px; width: 32px;" indeterminate />
        </div>        
		<div>
			<Button color="primary" href="/#/chat/" type="button">
				<Label>Cancel</Label>
			</Button>
		</div>
	</form>
</div>

<div class="page-wrapper" class:hidesettings={hideSettings}>
    <div><img src="/icons/logo-login.png" alt="Yama login logo" class="centre" width="128" height="87"/></div>
    <h1>Settings</h1>
    <div class="grid-container">

        <Name bind:oldPassword />

        <Username bind:oldPassword />

        <Email bind:oldPassword />

        <Phone bind:oldPassword />

        <Password bind:oldPassword />
        
        <EditAvatar bind:oldPassword />
        
    </div>
    <div>
        <Button color="primary" variant="raised" on:click={ () => { push("/chat/") } } type="button">
            <Label>Done</Label>
        </Button>
    </div>
</div>

<Footer />

<Alert bind:alert={snackbar} alertText={alertText} alertObject={alertObject} alertClass={alertClass} />

<style lang="scss">
    * :global(.grid-container) {
        display: grid;
        grid-template-columns: 380px 150px;
        padding: 10px 0;
        width: min-content;
        margin: 0 auto;
    }

    * :global(.grid-cell) {
        text-align: left;
        padding: 0 10px;
        width: 100%;
        margin: 0 0 20px 0;
    }
    * :global(.full-width) {
        grid-column: 1 / span 2;
        margin: 0;
    }

    * :global(.hidden) {
        display: none;
    }

    * :global(h3) {
        padding: 0;
        margin: 0;
    }
    * :global(button) {
        margin-left: 5px;
    }
    .hidesettings {
        display: none;
    }

    @media screen and (max-width: 600px) {
        * :global(.grid-container.grid-container) {
            grid-template-columns: 200px 100px;
        }

        * :global(.grid-container) {
            grid-template-columns: 300px;
        }
    }
</style>
