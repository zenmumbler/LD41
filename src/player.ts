class PlayerView {
	private angleX_ = 0;
	private angleY_ = 0;
	private rot_!: sd.Float4;
	private dir_ = [0, 0, -1];
	private up_ = [0, 1, 0];
	private velocity_ = [0, 0, 0];

	private shape_: physics.PhysicsShape;
	private transform_: entity.TransformInstance;
	private collider_: entity.ColliderInstance;
	private light_: entity.LightInstance;
	private rigidBody_: Ammo.btRigidBody;
	private tempBV3_: Ammo.btVector3;
	private tempTX_: Ammo.btTransform;
	readonly HEIGHT = 1.8;
	readonly MASS = 70;

	constructor(public initialPos: sd.Float3, private scene: sd.Scene) {
		this.rotate([0, 0]);

		this.shape_ = physics.makeShape({
			type: physics.PhysicsShapeType.Capsule,
			radius: .2,
			height: this.HEIGHT,
			orientation: Ammo.AxisIndex.Y
		})!;

		const ei = makeEntity(scene, {
			transform: {
				position: initialPos,
				rotation: quat.fromEuler(0, this.angleY_, this.angleX_)
			},
			rigidBody: {
				mass: this.MASS,
				shape: this.shape_,
				rotationConstraints: [true, false, true],
				isScripted: true,
				friction: 1,
				// linearDrag: 1
			},
			light: {
				type: entity.LightType.Point,
				colour: srgb8Color(255, 236, 200),
				range: 8.5,
				intensity: .8
			}
		});

		this.transform_ = ei.transform;
		this.collider_ = ei.collider;
		this.rigidBody_ = scene.colliders.rigidBody(this.collider_);
		this.light_ = ei.light;

		this.tempBV3_ = new Ammo.btVector3();
		this.tempTX_ = new Ammo.btTransform();
	}

	rotate(localRelXY: sd.Float2) {
		this.angleX_ -= Math.PI * 1.3 * localRelXY[1];
		this.angleX_ = math.clamp(this.angleX_, -Math.PI * 0.3, Math.PI * 0.3);
		this.angleY_ += Math.PI * 1.8 * localRelXY[0];
		this.rot_ = quat.fromEuler(0, this.angleY_, this.angleX_);
		vec3.transformQuat(this.dir_, [0, 0, 1], this.rot_);
		vec3.normalize(this.dir_, this.dir_);
		const tiltedUp = vec3.rotateZ([], [0, 1, 0], [0, 0, 0], this.tilt);
		vec3.transformQuat(this.up_, tiltedUp, this.rot_);
		vec3.normalize(this.up_, this.up_);
	}

	reset() {
		this.angleX_ = 0;
		this.angleY_ = 0;
		this.rotate([0, 0]);
		this.scene.transforms.setPositionAndRotation(this.transform_, this.initialPos, this.rot_);
		this.tempTX_.setFromOpenGLMatrix(this.scene.transforms.worldMatrix(this.transform_));
		this.rigidBody_.setWorldTransform(this.tempTX_);
	}

	update(timeStep: number, acceleration: number, sideAccel: number) {
		this.rotate([0, 0]);
		const fwdXZ = vec3.normalize([], [this.dir_[0], 0, this.dir_[2]]);
		const rightXZ = vec3.cross([], fwdXZ, [0, 1, 0]);

		vec3.scaleAndAdd(this.velocity_, this.velocity_, fwdXZ, acceleration * timeStep);
		vec3.scaleAndAdd(this.velocity_, this.velocity_, rightXZ, sideAccel * timeStep);

		vec3.scale(this.velocity_, this.velocity_, 0.85);
		if (vec3.length(this.velocity_) < 0.01) {
			vec3.set(this.velocity_, 0, 0, 0);
			this.rigidBody_.setDamping(1, 1);
		}
		else {
			this.rigidBody_.setDamping(0, 0);
		}

		const lv = this.rigidBody_.getLinearVelocity();
		this.tempBV3_.setValue(this.velocity_[0], lv.y(), this.velocity_[2]);
		this.rigidBody_.setLinearVelocity(this.tempBV3_);

		// ---

		const lt = Math.sin(sd.App.globalTime * 6.28);
		this.scene.lights.setIntensity(this.light_, .6 + .03 * lt);
		this.scene.lights.setRange(this.light_, 8.5 + .15 * lt);
	}

	get rigidBody() { return this.rigidBody_; }

	get pos() { return this.scene.transforms.localPosition(this.transform_); }
	get dir() { return this.dir_; }
	get rotation() { return this.rot_; }
	get moving() { return this.rigidBody_.getLinearVelocity().length() > 1; }
	get focusPos() { return vec3.add([], this.pos, this.dir_); }
	get up() { return this.up_; }

	public tilt = 0;
}


const enum KeyboardType {
	QWERTY,
	QWERTZ,
	AZERTY
}


const enum KeyCommand {
	Forward,
	Backward,
	Left,
	Right,
	Interact
}


class PlayerController {
	view: PlayerView;
	private vpWidth_: number;
	private vpHeight_: number;
	private baseSpeed_ = 70;
	private speedVariance_ = 0;
	private stepVariance_ = 0;
	private stop_ = true;

	constructor(sensingElem: HTMLElement, initialPos: sd.Float3, scene: sd.Scene, private sfx: Sound) {
		this.view = new PlayerView(initialPos, scene);

		this.vpWidth_ = sensingElem.offsetWidth;
		this.vpHeight_ = sensingElem.offsetHeight;

		dom.on(sensingElem, "mousedown", () => {
			control.mouse.lock();
		});
	}

	public keyboardType = KeyboardType.QWERTY;

	private keyForKeyCommand(cmd: KeyCommand): control.Key {
		let keys: control.Key[] | undefined;
		switch (cmd) {
			case KeyCommand.Forward:
				keys = [control.Key.W, control.Key.W, control.Key.Z];
				break;
			case KeyCommand.Backward:
				keys = [control.Key.S, control.Key.S, control.Key.S];
				break;
			case KeyCommand.Left:
				keys = [control.Key.A, control.Key.A, control.Key.Q];
				break;
			case KeyCommand.Right:
				keys = [control.Key.D, control.Key.D, control.Key.D];
				break;
			case KeyCommand.Interact:
				keys = [control.Key.E, control.Key.E, control.Key.E];
				break;
		}

		return keys ? keys[this.keyboardType] : 0;
	}


	private stepSoundTimer_ = -1;

	handleStepSounds() {
		if (this.view.moving) {
			if (this.stepSoundTimer_ === -1) {
				const st = Math.sin(sd.App.globalTime * 4);
				this.stepSoundTimer_ = setTimeout(() => {
					this.stepSoundTimer_ = -1;
					this.sfx.play(SFX.FootStep);
				}, 500 + this.stepVariance_ * st);
				// this.stepSoundTimer_ = setInterval(() => { this.sfx.play(SFX.FootStep); }, 500);
			}
		}
		else {
			this.stopSteps();
		}
	}

	stopSteps() {
		if (this.stepSoundTimer_ > -1) {
			clearInterval(this.stepSoundTimer_);
			this.stepSoundTimer_ = -1;
		}
	}

	public shaking = false;

	gameStateChanged(gs: GameState) {
		if (this.stop_) {
			return;
		}
		if (gs.ending) {
			this.stop_ = true;
			this.stopSteps();
			control.mouse.unlock();
		}
		else {
			const count = 0;
			this.speedVariance_ = 8 * count;
			this.baseSpeed_ = 70 - 10 * count;
			this.stepVariance_ = 70 * count;
		}
	}

	go() {
		this.stop_ = false;
		control.mouse.lock();
	}

	step(timeStep: number) {
		if (this.stop_) {
			return;
		}

		const delta = control.mouse.positionDelta;
		vec2.divide(delta, delta, [-this.vpWidth_, -this.vpHeight_]);
		// vec2.scale(delta, delta, .25);
		this.view.rotate(delta);

		const st = Math.sin(sd.App.globalTime * 4);
		const maxAccel = this.baseSpeed_ + this.speedVariance_ * st;
		let accel = 0, sideAccel = 0;

		if (control.keyboard.down(control.Key.UP) || control.keyboard.down(this.keyForKeyCommand(KeyCommand.Forward))) {
			accel = maxAccel;
		}
		else if (control.keyboard.down(control.Key.DOWN) || control.keyboard.down(this.keyForKeyCommand(KeyCommand.Backward))) {
			accel = -maxAccel;
		}
		if (control.keyboard.down(control.Key.LEFT) || control.keyboard.down(this.keyForKeyCommand(KeyCommand.Left))) {
			sideAccel = -maxAccel;
		}
		else if (control.keyboard.down(control.Key.RIGHT) || control.keyboard.down(this.keyForKeyCommand(KeyCommand.Right))) {
			sideAccel = maxAccel;
		}

		if (accel !== 0 && sideAccel !== 0) {
			accel = Math.sign(accel) * 42.43;
			sideAccel = Math.sign(sideAccel) * 42.43;
		}

		this.view.update(timeStep, accel, sideAccel);

		this.handleStepSounds();
	}
}
