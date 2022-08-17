<!-- From this [GitHub accout](https://github.com/cptcrunchy/sound-board)

And from the [mdn_web_docs](https://developer.mozilla.org/en-US/docs/web/api/mediastream_recording_api) website

[Web Dictator](https://developer.mozilla.org/en-US/docs/web/api/mediastream_recording_api/using_the_mediastream_recording_api)

[W3C documents](https://w3c.github.io/mediacapture-record/#MediaRecorderAPI) -->

<script>
	import { onMount } from 'svelte'
	let media = []
	let mediaRecorder = null;
	onMount(async () => {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		
		mediaRecorder = new MediaRecorder(stream);
		mediaRecorder.ondataavailable = (e) => media.push(e.data)
		mediaRecorder.onstop = function(){
			const audio = document.querySelector('audio');
			const blob = new Blob( media, {'type' : 'audio/ogg; codecs=opus' });
			media = [];
			audio.src = window.URL.createObjectURL(blob);
		}
		
	})
	
	function recordAudioStart(){
		mediaRecorder.start();
	}
	function recordAudioStop(){
		mediaRecorder.stop();
	}
</script>

<section>
	<h2>Audio Recording Test Page</h2>
	<audio controls/>
	<button on:click={recordAudioStart}>Record</button>
	<button on:click={recordAudioStop}>Stop</button>
</section>

<style>
	section{
		display: flex;
		flex-flow: column;
		width: 300px;
	}
</style>