class SmoothNum {
	private v_: number;
	private target_: number;
	private interval_: number;
	private t0: number;
	private t1: number;

	constructor(init: number, interval: number) {
		this.v_ = this.target_ = init;
		this.t0 = this.t1 = 0;
		this.interval_ = interval;
	}

	set value(nv: number) {
		if (nv !== this.target_) {
			this.v_ = this.value;
			this.target_ = nv;
			this.t0 = Date.now();
			this.t1 = this.t0 + this.interval_;
		}
	}

	get value() {
		let t = Date.now();
		if (t <= this.t0) {
			return this.v_;
		}
		if (t >= this.t1) {
			return this.target_;
		}
		const d = this.t1 - this.t0;
		const dv = this.target_ - this.v_;
		t -= this.t0;
		t /= d;
		t = t * t;
		return this.v_ + dv * t;
	}
}


type GameStateListener = ((gs: GameState) => any) | { gameStateChanged(gs: GameState): any; };

class GameState {
	private message_ = "";
	private messageEndTimer_ = 0;
	private ending_ = false;

	private listeners_: GameStateListener[] = [];

	listen(f: GameStateListener) {
		this.listeners_.push(f);
	}
	private signal() {
		for (const l of this.listeners_) {
			if (typeof l === "function") {
				l(this);
			}
			else {
				l.gameStateChanged(this);
			}
		}
	}

	showMessage(m: string) {
		this.message_ = m;
		const duration = 1500 + m.split(" ").length * 275;
		if (this.messageEndTimer_) {
			clearTimeout(this.messageEndTimer_);
		}
		if (m !== "The End") {
			this.messageEndTimer_ = setTimeout(() => {
				this.message_ = "";
				this.signal();
			}, duration);
		}
		this.signal();
	}
	get message() { return this.message_; }

	setEnd() { this.ending_ = true; this.signal(); }
	get ending() { return this.ending_; }
}
