<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { TopAppBarComponentDev } from '@smui/top-app-bar';
  import TopAppBar, { Row, Section, Title, AutoAdjust } from '@smui/top-app-bar';
  import IconButton, { Icon } from '@smui/icon-button';
  import Button, { Label } from '@smui/button';
  import Drawer from "./Menu-Drawer.svelte"
  import {location, push} from 'svelte-spa-router'
  import Avatar from "./Avatar.svelte";
	import { STORE_loggedIn } from "./../stores"

  let topAppBar: TopAppBarComponentDev;
  let darkMode
  let userLoggedIn = false

  function setActive(location: string) {
    push('/'+location)
  }

  const unsubscribe = STORE_loggedIn.subscribe(value => {
		userLoggedIn = value;
	});
	onDestroy(unsubscribe);

  let userdata = {
    _id: null,
    avatar: null
  }

  $: if (userLoggedIn) {
    userdata = {
      _id: localStorage.getItem("_id"),
      avatar: localStorage.getItem("avatar")
    }
  }

  onMount (() => {
    darkMode = window.matchMedia('prefers-color-scheme: dark')
  });
  
  let menuOpen = false;

  function toggleMenu() {
    menuOpen = !menuOpen
  }

</script>

<!-- Toggle Light and Dark Mode for the User -->
<svelte:head>
	<!-- SMUI Styles -->
	{#if darkMode === undefined }
    <link rel="stylesheet" href="/smui.css" media="(prefers-color-scheme: light)"/>
    <link rel="stylesheet" href="/smui-dark.css" media="screen and (prefers-color-scheme: dark)"/>
	{:else if darkMode}
    <link rel="stylesheet" href="/smui.css" />
    <link rel="stylesheet" href="/smui-dark.css" media="screen"/>
	{:else}
    <link rel="stylesheet" href="/smui.css" />
	{/if}
</svelte:head>


<TopAppBar bind:this={topAppBar} variant="static" dense style="position: fixed;">
    <Row>
      <Section>
        <IconButton class="material-icons" on:click={toggleMenu}>menu</IconButton>
        <Title><Button href="#/chat">YaMa</Button></Title>
      </Section>
      <Section align="end" toolbar>
        <IconButton class="material-icons" on:click={() => (darkMode = !darkMode)} title = {darkMode ? 'Daytime' : 'Night Time'}>
          {#if darkMode}
            light_mode
          {:else}
            dark_mode
          {/if}
        </IconButton>
        {#if userLoggedIn}
          <Avatar object={userdata} on:click={() => setActive('settings')}/>
        {/if}
  </Section>
    </Row>
</TopAppBar>
<AutoAdjust {topAppBar} />  
<Drawer bind:open={menuOpen}/>

<style>
    /* Hide everything above this component. */
    :global(app),
    :global(body),
    :global(html) {
      display: block !important;
      height: auto !important;
      width: auto !important;
      position: static !important;
    }
  </style>
