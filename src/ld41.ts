// Pincraft - a game for LD41: Combine 2 Unlikely genres
// (c) 2018 by Arthur Langereis — @zenmumbler

/// <reference path="./imports.ts" />
/// <reference path="./sfx.ts" />
/// <reference path="./entities.ts" />
/// <reference path="./player.ts" />
/// <reference path="./gamestate.ts" />
/// <reference path="./atmospheric.ts" />


class MainScene implements sd.SceneDelegate {
	scene!: sd.Scene;
	gameState!: GameState;
	sound!: Sound;
	ux: Interactable[] = [];
	framers: Updateable[] = [];
	board!: EntityInfo;
	ball!: EntityInfo;
	paddleLeft!: EntityInfo;
	hingeLeft!: Ammo.btHingeConstraint;
	hingeRight!: Ammo.btHingeConstraint;
	paddleRight!: EntityInfo;

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
			steps: [
				cache("audio", "step0"),
				cache("audio", "step1")
			],
			music: cache("audio", "music"),
			thing: cache("audio", "thing"),
		});

		scene.camera.perspective(60, 0.1, 10);

		// --------- LEVEL GEOMETRY
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

		// BASE
		const floor = makeEntity(scene, {
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
		// @ts-ignore
		const floorBody = scene.colliders.rigidBody(floor.collider);

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
		
		// BALL
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


		// PADDLES

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

		const paddleBodyLeft = scene.colliders.rigidBody(this.paddleLeft.collider);
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

		const paddleBodyRight = scene.colliders.rigidBody(this.paddleRight.collider);
		const hingeRight = new Ammo.btHingeConstraint(paddleBodyRight, new Ammo.btVector3(-(paddleWHalf - paddlePivot), 0, 0.008), new Ammo.btVector3(0, 1, 0));
		hingeRight.setLimit(math.deg2rad(-30), math.deg2rad(30), 0.0, 0.5, 0.0);
		scene.physicsWorld.addConstraint(hingeRight);
		this.hingeRight = hingeRight;


		// ---- LIGHTS
		makeEntity(scene, {
			transform: {
				position: [0, 0, 0],
				rotation: quat.fromEuler(math.deg2rad(-45), 0, 0)
			},
			light: {
				type: entity.LightType.Directional,
				colour: [0, 0, 1],
				intensity: .9
			}
		});
		makeEntity(scene, {
			transform: {
				position: [0, 0, 0],
				rotation: quat.fromEuler(math.deg2rad(45), math.deg2rad(180), 0)
			},
			light: {
				type: entity.LightType.Directional,
				colour: [1, 0, 0],
				intensity: .7
			}
		});

		// ----- finish up
		allocGeoms(scene);

		// this.sound.startMusic(false);
	}

	begin() {
	}

	update(timeStep: number) {
		const scene = this.scene;
		scene.camera.lookAt([0, .85, .15], [0, 0, .40], [0, 0, 1]);

		// send update event to those interested
		for (const ua of this.framers) {
			ua.update(timeStep);
		}

		if (control.keyboard.pressed(control.Key.SPACE)) {
			scene.colliders.rigidBody(this.ball.collider).applyCentralForce(new Ammo.btVector3(0, 0, 6.5));
		}

		const upImpulse = 45;
		const upSpeed = 22;
		const downImpulse = 20;
		const downSpeed = 10;
		if (control.keyboard.pressed(control.Key.LEFT)) {
			this.hingeLeft.enableAngularMotor(true, upSpeed, upImpulse);
		}
		else if (control.keyboard.released(control.Key.LEFT)) {
			this.hingeLeft.enableAngularMotor(true, -downSpeed, downImpulse);
		}
		if (control.keyboard.pressed(control.Key.RIGHT)) {
			this.hingeRight.enableAngularMotor(true, -upSpeed, upImpulse);
		}
		else if (control.keyboard.released(control.Key.RIGHT)) {
			this.hingeRight.enableAngularMotor(true, downSpeed, downImpulse);
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
