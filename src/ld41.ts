// PinCraft - a game for LD41: Combine 2 Unlikely genres
// (c) 2018 by Arthur Langereis — @zenmumbler

/// <reference path="./imports.ts" />
/// <reference path="./sfx.ts" />
/// <reference path="./entities.ts" />
/// <reference path="./gamestate.ts" />

interface BumperInfo {
	x: number;
	z: number;
	radius: number;
	points: number;
	colour: [number, number, number];
}

class MainScene implements sd.SceneDelegate {
	scene!: sd.Scene;
	gameState!: GameState;
	sound!: Sound;

	board!: EntityInfo;
	ball!: EntityInfo;

	bumperInfos: BumperInfo[] = [];
	bumpers: EntityInfo[] = [];
	bumperMats: effect.StandardEffectData[] = [];

	paddleLeft!: EntityInfo;
	paddleRight!: EntityInfo;
	hingeLeft!: Ammo.btHingeConstraint;
	hingeRight!: Ammo.btHingeConstraint;

	score = 0;
	scoreT0 = 0;
	scoreSN = new SmoothNum(0, 300);
	deaths = 0;

	willLoadAssets() {
		dom.show(".overlay.loading");
	}

	assetLoadProgress(ratio: number) {
		dom.$1(".bar .progress").style.width = Math.round(ratio * 100) + "%";
	}

	finishedLoadingAssets() {
		dom.hide(".overlay.loading");
	}

	gameStateChanged(_gs: GameState) {
	}

	setup() {
		const scene = this.scene;
		const cache = scene.assets;

		this.gameState = new GameState();
		this.gameState.listen(this);

		this.sound = new Sound(scene.ad, {
			music: cache("audio", "music"),
			launch: cache("audio", "launch"),
			flipper: cache("audio", "flipper"),
			bumper: cache("audio", "bumper"),
			die: cache("audio", "die"),
		});

		scene.camera.perspective(60, 0.1, 10);

		// --------- LEVEL GEOMETRY
		const makeLevel = () => {
			const levelModel = cache("model", "board");
			const levelShape = physics.makeShape({
				type: physics.PhysicsShapeType.Mesh,
				geom: levelModel.geom
			})!;
	
			this.board = makeEntity(scene, {
				transform: {
					position: [0, 0, 0],
					rotation: quat.fromEuler(0, 0, math.deg2rad(-4.5))
				},
				geom: levelModel.geom,
				renderer: {
					materials: levelModel.materials.map(mat => makePBRMat(scene, mat))
				},
				rigidBody: {
					shape: levelShape,
					mass: 0,
					friction: 0.1,
					restitution: .3
				}
			});
	
			// FLOOR
			makeEntity(scene, {
				parent: this.board.transform,
				transform: {
					position: [0, -0.01, 0.435]
				},
				rigidBody: {
					mass: 0,
					friction: 0.1,
					shape: physics.makeShape({
						type: physics.PhysicsShapeType.Box,
						halfExtents: [0.285, 0.01, 0.435]
					})!
				},
				geom: geometry.gen.generate(new geometry.gen.Box({ width: .57, height: .02, depth: .87 })),
				// renderer: {
				// 	materials: [makePBRMat(scene, asset.makeStandardMaterial({
				// 		type: "diffuse",
				// 		baseColour: [0, .7, 0]
				// 	}))]
				// }
			});
	
			// ROOF
			makeEntity(scene, {
				parent: this.board.transform,
				transform: {
					position: [0, 0.05, 0.435]
				},
				rigidBody: {
					mass: 0,
					friction: 0.1,
					shape: physics.makeShape({
						type: physics.PhysicsShapeType.Box,
						halfExtents: [0.285, 0.01, 0.435]
					})!
				},
				// geom: geometry.gen.generate(new geometry.gen.Box({ width: .57, height: .02, depth: .87 })),
				// renderer: {
				// 	materials: [makePBRMat(scene, asset.makeStandardMaterial({
				// 		type: "diffuse",
				// 		baseColour: [0, .7, 0]
				// 	}))]
				// }
			});
		};
		makeLevel();
		
		// --------- BALL
		this.ball = makeEntity(scene, {
			transform: {
				position: [-0.26, .014, .03]
			},
			rigidBody: {
				mass: .08,
				friction: 0.1,
				restitution: .3,
				isScripted: true,
				shape: physics.makeShape({
					type: physics.PhysicsShapeType.Sphere,
					radius: .0135,
				})!,
			},
			geom: geometry.gen.generate(new geometry.gen.Sphere({ radius: .0135, rows: 10, segs: 10 })),
			renderer: {
				materials: [makePBRMat(scene, asset.makeStandardMaterial({
					type: "diffusespecular",
					baseColour: [1, 0, 0],
					specularFactor: [1, 1, 1],
					specularExponent: 8
				}))]
			}
		});


		// --------- PADDLES
		const makePaddles = () => {
			const paddleW = .1;
			const paddleWHalf = paddleW / 2;
			const paddlePivot = 0.00;
			const paddleMass = 0.2;
			const paddleMaterial = makePBRMat(scene, asset.makeStandardMaterial({
				type: "diffuse",
				baseColour: [.7, .7, 0]
			}));
			const paddleShape = physics.makeShape({
				type: physics.PhysicsShapeType.Box,
				halfExtents: [paddleWHalf, 0.01, 0.008]
			})!;
	
			this.paddleLeft = makeEntity(scene, {
				parent: this.board.transform,
				transform: {
					position: [0.09, .0135, .17],
				},
				rigidBody: {
					mass: paddleMass,
					friction: 0.0,
					restitution: 0.7,
					isScripted: true,
					shape: paddleShape
				},
				geom: geometry.gen.generate(new geometry.gen.Box({ width: paddleW, height: .02, depth: .016 })),
				renderer: {
					materials: [paddleMaterial]
				}
			});
	
			const paddleBodyLeft = scene.colliders.rigidBody(this.paddleLeft.collider)!;
			const hingeLeft = new Ammo.btHingeConstraint(paddleBodyLeft, new Ammo.btVector3(paddleWHalf - paddlePivot, 0, 0.008), new Ammo.btVector3(0, 1, 0));
			hingeLeft.setLimit(math.deg2rad(-30), math.deg2rad(30), 0.0, 0.5, 0.0);
			scene.physicsWorld.addConstraint(hingeLeft);
			this.hingeLeft = hingeLeft;
	
			this.paddleRight = makeEntity(scene, {
				parent: this.board.transform,
				transform: {
					position: [-0.05, .0135, .17],
				},
				rigidBody: {
					mass: paddleMass,
					friction: 0.0,
					restitution: 0.7,
					isScripted: true,
					shape: paddleShape
				},
				geom: geometry.gen.generate(new geometry.gen.Box({ width: paddleW, height: .02, depth: .016 })),
				renderer: {
					materials: [paddleMaterial]
				}
			});
	
			const paddleBodyRight = scene.colliders.rigidBody(this.paddleRight.collider)!;
			const hingeRight = new Ammo.btHingeConstraint(paddleBodyRight, new Ammo.btVector3(-(paddleWHalf - paddlePivot), 0, 0.008), new Ammo.btVector3(0, 1, 0));
			hingeRight.setLimit(math.deg2rad(-30), math.deg2rad(30), 0.0, 0.5, 0.0);
			scene.physicsWorld.addConstraint(hingeRight);
			this.hingeRight = hingeRight;
		};
		makePaddles();


		// --------- BUMPERS
		this.bumperInfos = [
			{
				x: 0.02,
				z: 0.70,
				radius: .043,
				colour: [1, .5, 0],
				points: 1000
			},
			{
				x: 0.02,
				z: 0.55,
				radius: .033,
				colour: [0, 1, 0],
				points: 500
			},
			{
				x: -0.08,
				z: 0.46,
				radius: .033,
				colour: [1, 1, 0],
				points: 100
			},
			{
				x: 0.12,
				z: 0.46,
				radius: .033,
				colour: [1, 1, 0],
				points: 100
			},
			{
				x: 0.242,
				z: 0.585,
				radius: .033,
				colour: [.7, 0, 0],
				points: 250
			},
			{
				x: -0.202,
				z: 0.585,
				radius: .033,
				colour: [.7, 0, 0],
				points: 250
			},
		];

		this.bumperMats = this.bumperInfos.map(bi => makePBRMat(scene, asset.makeStandardMaterial({
			type: "diffuse",
			baseColour: bi.colour,
		})));

		this.bumpers = this.bumperInfos.map((bi, index) => makeEntity(scene, {
			parent: this.board.transform,
			transform: {
				position: [bi.x, 0.02, bi.z]
			},
			ghost: {
				shape: physics.makeShape({
					type: physics.PhysicsShapeType.Sphere,
					radius: bi.radius,
				})!
			},
			geom: geometry.gen.generate(new geometry.gen.Sphere({ radius: bi.radius, rows: 8, segs: 8 })),
			renderer: {
				materials: [this.bumperMats[index]]
			}
		}));


		// ---- LIGHTS
		makeEntity(scene, {
			transform: {
				position: [0, 0, 0],
				rotation: quat.fromEuler(math.deg2rad(-45), 0, 0)
			},
			light: {
				type: entity.LightType.Directional,
				colour: [1, 1, 1],
				intensity: .8
			}
		});
		makeEntity(scene, {
			transform: {
				position: [0, 0, 0],
				rotation: quat.fromEuler(math.deg2rad(45), math.deg2rad(180), 0)
			},
			light: {
				type: entity.LightType.Directional,
				colour: [1, 1, 1],
				intensity: .8
			}
		});

		// ----- finish up
		allocGeoms(scene);
		// this.sound.startMusic(false);
	}

	begin() {
	}

	private tempMS = new Ammo.btTransform();

	update(_timeStep: number) {
		const scene = this.scene;
		scene.camera.lookAt([0, .86, .15], [0, 0, .40], [0, 0, 1]);
		vec4.set(scene.rw.mainClearColour, 1, 1, 1, 1); // blarg

		for (let bumpIx = 0; bumpIx < this.bumpers.length; ++bumpIx) {
			const ghost = scene.colliders.ghostObject(this.bumpers[bumpIx].collider)!;
			const ghostHits = ghost.getNumOverlappingObjects();
			let isHit = 0;
			if (ghostHits > 0) {
				const rb1 = scene.physicsWorld.asRigidBody(ghost.getOverlappingObject(0));
				if (rb1) {
					const gpos = ghost.getWorldTransform().getOrigin();
					rb1.getMotionState().getWorldTransform(this.tempMS);
					const rpos = this.tempMS.getOrigin();

					const gvec = [gpos.x(), gpos.y(), gpos.z()];
					const rvec = [rpos.x(), rpos.y(), rpos.z()];

					const outward = vec3.subtract([], rvec, gvec);
					const distance = vec3.length(outward);
					if (distance <= (.0135 + this.bumperInfos[bumpIx].radius)) {
						isHit = 1;
						// were we not yet touching this bumper?
						if (this.bumperMats[bumpIx].tint[2] !== 1) {
							outward[1] = 0; // clear any y differences
							vec3.normalize(outward, outward);
							vec3.scale(outward, outward, 2); // how hard to bounce?
							scene.colliders.rigidBody(this.ball.collider)!.applyCentralForce(new Ammo.btVector3(outward[0], 0, outward[2]));
							this.sound.play(SFX.Bumper);
							this.score += this.bumperInfos[bumpIx].points;
							this.scoreSN.value = this.score;
						}
					}
				}
			}
			this.bumperMats[bumpIx].tint[2] = isHit;
		}

		// SCORE UPDATE
		const curScore = this.scoreSN.value | 0;
		if (curScore !== this.scoreT0) {
			this.scoreT0 = curScore;
			document.getElementById("score")!.textContent = `${curScore}`;
		}

		// INPUT

		const upImpulse = 44;
		const upSpeed = 22;
		const downImpulse = 20;
		const downSpeed = 10;
		if (control.keyboard.pressed(control.Key.LEFT)) {
			this.sound.play(SFX.Flipper);
			this.hingeLeft.enableAngularMotor(true, upSpeed, upImpulse);
		}
		else if (control.keyboard.released(control.Key.LEFT)) {
			this.hingeLeft.enableAngularMotor(true, -downSpeed, downImpulse);
		}
		if (control.keyboard.pressed(control.Key.RIGHT)) {
			this.sound.play(SFX.Flipper);
			this.hingeRight.enableAngularMotor(true, -upSpeed, upImpulse);
		}
		else if (control.keyboard.released(control.Key.RIGHT)) {
			this.hingeRight.enableAngularMotor(true, downSpeed, downImpulse);
		}

		// ball position dependent events
		const ballPos = scene.transforms.localPosition(this.ball.transform);

		if (ballPos[1] < -2.0) {
			this.sound.play(SFX.Die);
			this.deaths += 1;
			document.getElementById("deaths")!.textContent = `${this.deaths}`;
			const tx = new Ammo.btTransform();
			tx.setOrigin(new Ammo.btVector3(-0.26, .014, .03));
			scene.colliders.rigidBody(this.ball.collider)!.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
			scene.colliders.rigidBody(this.ball.collider)!.setWorldTransform(tx);
			// scene.transforms.setPosition(this.ball.transform, [-0.26, .014, .03]);
		}
		else if (control.keyboard.pressed(control.Key.SPACE)) {
			if (ballPos[0] < -0.24 && ballPos[2] < .06) {
				this.sound.play(SFX.Launch);
				scene.colliders.rigidBody(this.ball.collider)!.applyCentralForce(new Ammo.btVector3(0, 0, 6.5));
			}
		}

	}
}

window.addEventListener("load", () => {
	sd.App.initialize({
		root: dom.$1(".stageholder"),
		width: 512,
		height: 768,
	}).then(() => {
		io.loadFile("data/assets-ld41.json", { tryBreakCache: true, responseType: io.FileLoadType.JSON })
		.then((assetsJSON: any) => {
			const scene = sd.App.makeScene({
				physicsConfig: physics.makeDefaultPhysicsConfig(),
				assets: assetsJSON.assets,
				delegate: new MainScene()
			});
			sd.App.scene = scene;
		});
	});
});
