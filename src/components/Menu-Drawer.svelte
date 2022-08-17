<script lang="ts">
    import Drawer, {AppContent,Content,Header,Title,Subtitle,Scrim,} from '@smui/drawer';
    import List, { Item, Text, Graphic, Separator } from '@smui/list';
    import {location, push} from 'svelte-spa-router'
    import { clearToken } from './../lib/token'
    import IconButton from "@smui/icon-button";
    import { STORE_loggedIn } from '../stores';

    export let open:boolean;
    function setActive(location: string) {
        open = false;
        push('/'+location)
    }

    function logout() {
        setActive('')
        clearToken();
        $STORE_loggedIn = false
    }
  </script>
  
<Drawer variant="modal" fixed={false} bind:open style="position: fixed;">
    <Header>
        <Title style="padding-left: 0;">
            YaMa
            <span style="opacity: 0.6; position: relative; top: -7px; left: 120px;">
                <IconButton class="material-icons" touch on:click={()=>{open=false}}>cancel</IconButton>
            </span>
        </Title>
        <Subtitle>Yet Another Messaging App</Subtitle>
    </Header>
    <Separator />
    <Content>
        <List class="menu-item-list">
            <Item on:click={() => setActive('')} activated={$location === '/'}>
                <Graphic class="material-icons" aria-hidden="true">home</Graphic>
                <Text>Home</Text>
            </Item>
            <Item on:click={() => setActive('chat')} activated={$location === '/chat'}>
                <Graphic class="material-icons" aria-hidden="true">chat</Graphic>
                <Text>Chat</Text>
            </Item>
            <Item on:click={() => setActive('settings')} activated={$location === '/settings'}>
                <Graphic class="material-icons" aria-hidden="true">settings</Graphic>
                <Text>Settings</Text>
            </Item>
            <Item on:click={() => setActive('about')} activated={$location === '/about'}>
                <Graphic class="material-icons" aria-hidden="true">info</Graphic>
                <Text>About</Text>
            </Item>
           <Item on:click={() => {logout(); }} activated={false}>
                <Graphic class="material-icons" aria-hidden="true">logout</Graphic>
                <Text>Logout</Text>
            </Item>
        </List>
    </Content>
</Drawer>
  
<!-- Don't include fixed={false} if this is a page wide drawer.
          It adds a style for absolute positioning. -->
<Scrim fixed={false} />
<AppContent class="app-content">
    <main class="main-content"/>
</AppContent>
        
<style>
    * :global(.app-content) {
      flex: auto;
      overflow: auto;
      position: relative;
      flex-grow: 1;
    }
  
    .main-content {
      overflow: auto;
      padding: 16px;
      height: 100%;
      box-sizing: border-box;
    }

</style>
  