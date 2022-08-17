<script lang="ts">
    import Icon from '@smui/textfield/icon';

    export let variable: string

    function clearField(event) {
        // Clear the passed variable bound to the field
        variable = ""
        // Pass focus to the field if possible
        try {
            event.target.parentElement.firstChild.focus();
        } catch (err) {
            console.warn("Error passing focus to the parent field.", err)
        }
    }

</script>

<span style="cursor: pointer; opacity: 0.5; margin-top: 3px;" on:click={(event) => clearField(event)}>
    <Icon class="material-icons" style="vertical-align: sub;">cancel</Icon>
</span>
