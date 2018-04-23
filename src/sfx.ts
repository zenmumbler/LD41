const enum SFX {
	FootStep,
	Thing
}

const enum Music {
	None,
	Main
}

interface SoundAssets {
	steps: AudioBuffer[];
	music: AudioBuffer;
	thing: AudioBuffer;
}

class Sound {
	private assets_: SoundAssets;
	private ctx: AudioContext;

	private stepGain: GainNode;
	private musicGain: GainNode;
	private effectGain: GainNode;

	private stepSource: AudioBufferSourceNode | null = null;
	private musicSource: AudioBufferSourceNode | null = null;
	private effectSource: AudioBufferSourceNode | null = null;

	private stepToggle = 0;

	constructor(private ad: audio.AudioDevice, assets: SoundAssets) {
		const ctx = this.ctx = ad.ctx;
		this.assets_ = assets;

		this.stepGain = ctx.createGain();
		this.musicGain = ctx.createGain();
		this.effectGain = ctx.createGain();

		this.stepGain.connect(ctx.destination);
		this.musicGain.connect(ctx.destination);
		this.effectGain.connect(ctx.destination);
	}


	startMusic() {
		if (!this.musicSource) {
			this.musicSource = this.ad.ctx.createBufferSource();
			this.musicSource.buffer = this.assets_.music;
			this.musicSource.loop = true;
			this.musicSource.connect(this.musicGain);
			this.musicGain.gain.value = 0.60;

			this.musicSource.start(0);
		}
	}

	stopMusic() {
		if (this.musicSource) {
			this.musicSource.stop();
			this.musicSource = null;
		}
	}

	play(what: SFX) {
		const assets = this.assets_;
		if (!this.ad) {
			return;
		}

		let buffer: AudioBuffer | null = null;
		let source: AudioBufferSourceNode | null = null;
		let gain: GainNode | null = null;
		let volume = 0;
		let rate: number | null = null;

		switch (what) {
			case SFX.FootStep: buffer = assets.steps[this.stepToggle]; source = this.stepSource; gain = this.stepGain; volume = 1; rate = 1; this.stepToggle ^= 1; break;
			case SFX.Thing: buffer = assets.thing; source = this.effectSource; gain = this.effectGain; volume = 1.0; rate = 1.0; break;

			default: buffer = null;
		}

		if (!buffer || !gain) {
			return;
		}
		if (source) {
			source.stop();
		}

		let bufferSource: AudioBufferSourceNode | null = this.ad.ctx.createBufferSource();
		bufferSource.buffer = buffer;
		bufferSource.connect(gain);
		if (rate !== null) {
			bufferSource.playbackRate.value = rate;
		}
		bufferSource.start(0);
		gain.gain.value = volume;

		if (what === SFX.FootStep) {
			this.stepSource = bufferSource;
		}
		else {
			this.effectSource = bufferSource;
		}

		bufferSource.onended = () => {
			if (this.effectSource === bufferSource) {
				this.effectSource = null;
			}
			else if (this.stepSource === bufferSource) {
				this.stepSource = null;
			}

			bufferSource!.disconnect();
			bufferSource = null;
		};

	}
}
