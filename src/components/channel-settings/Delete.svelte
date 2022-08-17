<script lang="ts">
    import Button, { Label } from '@smui/button';
    import Icon from '@smui/textfield/icon';

    export let confirmDelete:boolean

</script>

<h3>Delete the channel</h3>
<div>
    <Button color="primary" variant="raised" on:click={() => {confirmDelete = true}} style="background: red;" type="button">
        <Icon class="material-icons">dangerous</Icon>
        <Label>Delete Channel</Label>
    </Button>
</div>
