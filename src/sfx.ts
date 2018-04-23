const enum SFX {
	Launch,
	Flipper,
	Bumper,
	Die
}

const enum Music {
	None,
	Main
}

interface SoundAssets {
	music: AudioBuffer;
	launch: AudioBuffer;
	flipper: AudioBuffer;
	bumper: AudioBuffer;
	die: AudioBuffer;
}

class Sound {
	private assets_: SoundAssets;
	private ctx: AudioContext;

	private plonkGain: GainNode;
	private musicGain: GainNode;
	private effectGain: GainNode;

	private plonkSource: AudioBufferSourceNode | null = null;
	private musicSource: AudioBufferSourceNode | null = null;
	private effectSource: AudioBufferSourceNode | null = null;

	constructor(private ad: audio.AudioDevice, assets: SoundAssets) {
		const ctx = this.ctx = ad.ctx;
		this.assets_ = assets;

		this.plonkGain = ctx.createGain();
		this.musicGain = ctx.createGain();
		this.effectGain = ctx.createGain();

		this.plonkGain.connect(ctx.destination);
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

		const randomTranspose = (notes: number) => {
			return 1.0 + (-notes + math.intRandomRange(0, notes * 2)) / 12;
		};

		switch (what) {
			case SFX.Launch: buffer = assets.launch; source = this.effectSource; gain = this.effectGain; volume = 1.0; rate = 1.0; break;
			case SFX.Flipper: buffer = assets.flipper; source = this.plonkSource; gain = this.plonkGain; volume = 1.0; rate = 1.0; break;
			case SFX.Bumper: buffer = assets.bumper; source = this.plonkSource; gain = this.plonkGain; volume = 1.0; rate = randomTranspose(2); break;
			case SFX.Die: buffer = assets.die; source = this.effectSource; gain = this.effectGain; volume = 0.8; rate = 1.0; break;

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

		if (what === SFX.Flipper || what === SFX.Bumper) {
			this.plonkSource = bufferSource;
		}
		else {
			this.effectSource = bufferSource;
		}

		bufferSource.onended = () => {
			if (this.effectSource === bufferSource) {
				this.effectSource = null;
			}
			else if (this.plonkSource === bufferSource) {
				this.plonkSource = null;
			}

			bufferSource!.disconnect();
			bufferSource = null;
		};

	}
}
