<script lang="ts">
    import Button, { Label } from '@smui/button';
	import Textfield from '@smui/textfield';
    import Icon from '@smui/textfield/icon';
    import ApiRequest from '../../lib/api';
    import { existingChannelName, validateChannelName } from '../../lib/validate';
    import ClearField from '../Clear-Field.svelte';
    import { STORE_newAlert } from './../../stores';
    import CircularProgress from '@smui/circular-progress';

    export let selectedGroup
    export let selectedChannel

    let invalidName = false
    let sameName = false
    let existingName = false 
    let newName = selectedChannel.name
    let working = false

    async function changeName() {
        working = true
        try {
            checkName()
            if (!sameName && !invalidName && !existingName) {
                let result = await ApiRequest.channelPatchRename(selectedChannel._id, newName)
                if (result == newName) {
                    selectedChannel.name = newName
                    $STORE_newAlert = {
                        alertText: "The channel name has been updated.",
                        alertObject: null,
                        alertClass: "info"
                    }
                } else {
                    console.error("Channel not fould in the group's channel information.")
                    $STORE_newAlert = {
                        alertText: "Unable to change the channels name due to an error.",
                        alertObject: null,
                        alertClass: "dangerous"
                    }
                }
            }
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Channel name change error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }

    async function checkName() {
        try {
            if (newName == selectedChannel.name) {
                sameName = true
                existingName = false
                invalidName = false
            } else {
                sameName = false
                if (validateChannelName(newName)) {
                    invalidName = false
                    let existing = await existingChannelName(selectedGroup._id, newName)
                    if (existing) {
                        existingName = true
                        sameName = false
                        invalidName = false
                    } else {
                        existingName = false
                    }
                } else {
                    invalidName = true
                    sameName = false
                    existingName = false
                }
            }
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Channel name check error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
    }

</script>

<h3>Change the channel name</h3>

<form on:submit|preventDefault={changeName}>
    <div class:hidden={working}>
        <Textfield variant="outlined" bind:value={newName} label="Name" type="text">
			<ClearField slot="trailingIcon" bind:variable = {newName} />
        </Textfield>
        <Button color="primary" variant="raised" type="submit">
            <Label>Change</Label>
        </Button>
        <div class="input_error" class:invalidName>Channel names should be at least 3 characters long and not contain spaces.</div>
        <div class="input_error" class:sameName>The channel name has not changed.</div>
        <div class="input_error" class:existingName>A channel already exists with the enetered name.</div>
    </div>
    <div class:hidden={!working}>
        <CircularProgress style="height: 32px; width: 32px;" indeterminate />
    </div>
</form>

<style lang="scss">
    .sameName, .existingName, .invalidName {
        display: block;
    }
</style>