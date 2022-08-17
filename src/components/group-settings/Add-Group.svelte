<script lang="ts">

    import ApiRequest from "../../lib/api"
    import Chat from "../Chat.svelte"
    import Button, { Label } from '@smui/button';
    import Switch from '@smui/switch';
    import FormField from '@smui/form-field';
    import Textfield from '@smui/textfield';
    import { existingGroupName, MINIMUM_GROUP_NAME_LENGTH, validateGroupName } from "../../lib/validate";
    import GroupSettings from "../Group-Settings.svelte";
    import ClearField from "../Clear-Field.svelte";
    import { STORE_newAlert } from '../../stores';
    import CircularProgress from '@smui/circular-progress';

    let groupName = '';
    let groupPublic = true;
    export let chatScreenComponent
    export let groups

    let invalidGroupName = false
    let duplicateGroup = false
    let working = false

    async function checkGroupName() {
        try {
            invalidGroupName = !(validateGroupName(groupName))
            if (!invalidGroupName) {
                duplicateGroup = await existingGroupName(groupName)
            } else {
                duplicateGroup = false
            }
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Group name check error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
    }

    async function createGroup() {
        working = true
        try {
            checkGroupName()
            if (!invalidGroupName && !duplicateGroup) {
                let result = await ApiRequest.groupPostCreate(groupName, null, !groupPublic, null);
                if (result && result._id) {
                    groups.push(result)
                    groups = groups // Force reactive refresh
                    $STORE_newAlert = {
                        alertText: "The group has been created.",
                        alertObject: null,
                        alertClass: "info"
                    }
                    chatScreenComponent = Chat
                }
            }   
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Group creation error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }

</script>

<form on:submit|preventDefault={createGroup}>
    <div>
        <Textfield variant="outlined" bind:value={groupName} label="Group Name" type="text">
            <ClearField slot="trailingIcon" bind:variable = {groupName} />
        </Textfield>
        <div id="group-error" class="input_error" class:invalid="{invalidGroupName}">Group names must have at least {MINIMUM_GROUP_NAME_LENGTH} characters <br> and contain no spaces.</div>
        <div id="group-exists" class="input_error" class:invalid="{duplicateGroup}">The group name already exists. Please choose another name.</div>
    </div>
    <div>
        <FormField>
        <Switch bind:checked={groupPublic} required/>
        <span slot="label">Public Group</span>
        </FormField>
    </div>
    <div class:hidden={working}>
        <Button color="primary" variant="raised" type="submit">
            <Label>Create</Label>
        </Button>
    </div>
    <div class:hidden={!working}>
        <CircularProgress style="height: 32px; width: 32px;" indeterminate />
    </div>
    <div>
        <Button color="primary" on:click={() => {chatScreenComponent=GroupSettings}} type="button">
            <Label>Back</Label>
    	</Button>
    </div>        
</form>

<style lang="scss">
	div {
		margin-bottom: 1rem;
	} 
</style>
