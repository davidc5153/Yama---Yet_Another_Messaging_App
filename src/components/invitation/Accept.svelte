<script lang="ts">
    import Button, { Label } from "@smui/button";
    import ApiRequest from "../../lib/api";
	import { STORE_newAlert } from './../../stores';
    import CircularProgress from '@smui/circular-progress';

    export let tokenJson
    export let complete

    let working = false

    async function acceptInvite() { 
        working = true
        try {    
            let result = await ApiRequest.acceptInvite(tokenJson.token)
            if (result) {
                localStorage.setItem("groupReadTime", "0")
                complete = true
                $STORE_newAlert = {
                    alertText: "The invitation has been accepted.",
                    alertObject: null,
                    alertClass: "info"
                }

            } else {
                console.error("Error accepting the invitation.")
                $STORE_newAlert = {
                    alertText: "There has been an error accepting the invitation.",
                    alertObject: null,
                    alertClass: "dangerous"
                }
            }
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Invitation acceptance error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
	}

</script>

<div class:hidden={working} >
    <Button color="primary" variant="raised" on:click={acceptInvite} type="button">
        <Label>Accept</Label>
    </Button>
</div>
<div class:hidden={!working}>
    <CircularProgress style="height: 32px; width: 32px;" indeterminate />
</div>

<style lang="scss">
    div {
        margin-bottom: 1rem;
    } 
</style>