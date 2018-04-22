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
	paddleRight!: EntityInfo;
	hingeRight!: Ammo.btHingeConstraint;
	end = false;

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
			endMusic: cache("audio", "endMusic"),
			thing: cache("audio", "thing"),
		});

		scene.camera.perspective(60, 0.1, 100);

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

		// PADDLE

		this.paddleRight = makeEntity(scene, {
			transform: {
				position: [0, .0135, .2],
				rotation: quat.fromEuler(0, math.deg2rad(15), math.deg2rad(-4.5))
			},
			rigidBody: {
				mass: 0.03,
				friction: 0.0,
				restitution: 0.5,
				// positionConstraints: [true, true, true],
				// rotationConstraints: [true, false, true],
				isScripted: true,
				// isKinematic: true,
				shape: physics.makeShape({
					type: physics.PhysicsShapeType.Box,
					halfExtents: [0.03, 0.01, 0.008]
				})!
			},
			geom: geometry.gen.generate(new geometry.gen.Box({ width: .06, height: .02, depth: .016 })),
			renderer: {
				materials: [makePBRMat(scene, asset.makeStandardMaterial({
					type: "diffuse",
					baseColour: [.7, .7, 0]
				}))]
			}
		});

		const paddleBody = scene.colliders.rigidBody(this.paddleRight.collider);
		// paddleBody.setGravity(new Ammo.btVector3(0, 0, 0));
		const hinge = new Ammo.btHingeConstraint(paddleBody, new Ammo.btVector3(-0.02, 0, 0), new Ammo.btVector3(0, 1, 0));
		// const hinge = new Ammo.btHingeConstraint(paddleBody, floorBody, new Ammo.btVector3(-0.02, 0, 0), new Ammo.btVector3(0, 0, 0), new Ammo.btVector3(0, 1, 0), new Ammo.btVector3(0, 1, 0), false);
		// hinge.setAngularOnly(true);
		hinge.setLimit(0, math.deg2rad(30), 0.0, 0.5, 0.0);
		scene.physicsWorld.addConstraint(hinge);
		this.hingeRight = hinge;

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

		// scene.transforms.rotateByAngles(this.board.transform, [0, math.deg2rad(.1), 0]);

		// send update event to those interested
		for (const ua of this.framers) {
			ua.update(timeStep);
		}

		if (control.keyboard.pressed(control.Key.SPACE)) {
			scene.colliders.rigidBody(this.ball.collider).applyCentralForce(new Ammo.btVector3(0, 0, 6.5));
		}

		const rightDown = control.keyboard.down(control.Key.RIGHT);
		this.hingeRight.setMotorTarget(+rightDown * math.deg2rad(30), timeStep * 2);
		this.hingeRight.enableMotor(rightDown);
		// this.hingeRight.enableAngularMotor(control.keyboard.down(control.Key.RIGHT), 10, 10);
		if (control.keyboard.down(control.Key.RIGHT)) {
			scene.colliders.rigidBody(this.paddleRight.collider).applyForce(new Ammo.btVector3(0, 0, 0.2), new Ammo.btVector3(0.02, 0, 0));
			// scene.colliders.rigidBody(this.paddleRight.collider).setAngularVelocity(new Ammo.btVector3(0.1, 0, 0));
		}
		else {
			// scene.colliders.rigidBody(this.paddleRight.collider).setAngularVelocity(new Ammo.btVector3(-0.1, 0, 0));
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
