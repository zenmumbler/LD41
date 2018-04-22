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
				rotation: quat.fromEuler(0, 0, math.deg2rad(-5))
			},
			geom: levelModel.geom,
			renderer: {
				materials: levelModel.materials.map(mat => makePBRMat(scene, mat))
			},
			rigidBody: {
				shape: levelShape,
				mass: 0,
				friction: 1
			}
		});

		makeEntity(scene, {
			transform: {
				position: [0, 0, 0],
				rotation: quat.fromEuler(math.deg2rad(45), 0, math.deg2rad(45))
			},
			light: {
				type: entity.LightType.Directional,
				colour: [1, 1, 1],
				intensity: .9
			}
		});
		makeEntity(scene, {
			transform: {
				position: [0, 0, 0],
				rotation: quat.fromEuler(math.deg2rad(-45), 0, math.deg2rad(-45))
			},
			light: {
				type: entity.LightType.Directional,
				colour: [1, 1, 1],
				intensity: .9
			}
		});

		// ----- PLAYER
		// this.player = new PlayerController(dom.$1("canvas"), [0, 1.1, 0], scene, this.sound);
		// this.gameState.listen(this.player);

		// ----- Interactables
		// this.ux.push(new InfoSphere(this.gameState, scene, cache, [26, 0, 17.2], `"The well of despair"\nI can't see or hear anything in it.`));
		// this.ux.push(new InfoSphere(this.gameState, scene, cache, [-26, 0, 17.2], `"The pit of decay"\nLooking into it is making me dizzy.`));
		// this.ux.push(new HintBox(this.gameState, scene, cache, "grid"));
		// this.ux.push(new HintBox(this.gameState, scene, cache, "ring"));
		// this.ux.push(new HintBox(this.gameState, scene, cache, "num"));

		for (const ia of this.ux) {
			if (isUpdateable(ia)) {
				this.framers.push(ia);
			}
		}
		
		// ----- finish up
		allocGeoms(scene);

		// this.sound.startMusic(false);
	}

	begin() {
	}

	update(timeStep: number) {
		const scene = this.scene;
		scene.camera.lookAt([0, .83, .15], [0, 0, .4], [0, 0, 1]);

		// scene.transforms.rotateByAngles(this.board.transform, [0, math.deg2rad(.1), 0]);

		// send update event to those interested
		for (const ua of this.framers) {
			ua.update(timeStep);
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
