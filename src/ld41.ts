// Untitled - a game for LD41: THEME
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
	player!: PlayerController;
	sound!: Sound;
	ux: Interactable[] = [];
	framers: Updateable[] = [];
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

	keyboardStuff() {
		dom.on(dom.$(`input[type="radio"][name="keymap"]`), "click", evt => {
			const radio = evt.target as HTMLInputElement;
			if (radio.checked) {
				const km = radio.dataset.km;
				if (km === "qwerty") {
					this.player.keyboardType = KeyboardType.QWERTY;
				}
				else {
					this.player.keyboardType = KeyboardType.AZERTY;
				}
			}
		});
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
		const levelModel = cache("model", "level");
		const levelShape = physics.makeShape({
			type: physics.PhysicsShapeType.Mesh,
			geom: levelModel.geom
		})!;

		makeEntity(scene, {
			transform: {
				position: [0, -4, 0]
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

		// ----- PLAYER
		this.player = new PlayerController(dom.$1("canvas"), [0, 1.1, 0], scene, this.sound);
		this.gameState.listen(this.player);

		// ----- Interactables
		this.ux.push(new InfoSphere(this.gameState, scene, cache, [26, 0, 17.2], `"The well of despair"\nI can't see or hear anything in it.`));
		this.ux.push(new InfoSphere(this.gameState, scene, cache, [-26, 0, 17.2], `"The pit of decay"\nLooking into it is making me dizzy.`));
		this.ux.push(new HintBox(this.gameState, scene, cache, "grid"));
		this.ux.push(new HintBox(this.gameState, scene, cache, "ring"));
		this.ux.push(new HintBox(this.gameState, scene, cache, "num"));

		for (const ia of this.ux) {
			if (isUpdateable(ia)) {
				this.framers.push(ia);
			}
		}
		
		// ----- finish up
		allocGeoms(scene);

		dom.show("div.titles");
		this.keyboardStuff();
		this.sound.startMusic(false);
	}

	begin() {
		dom.hide("div.titles");
		this.player.go();

		setTimeout(() => {
			this.gameState.showMessage("After many years, I have found this forsaken place.\nThe orbs lie within, I... will seize their power!");
		}, 1500);

		setTimeout(() => {
			const wasd = this.player.keyboardType === KeyboardType.QWERTY ? "WASD" : "ZQSD";
			this.gameState.showMessage(`${wasd} to move, E to interact`);
		}, 7500);
	}

	private inFocus: entity.Entity = 0;

	update(timeStep: number) {
		const scene = this.scene;
		const player = this.player;
		player.step(timeStep);
		this.scene.camera.lookAt(player.view.pos, player.view.focusPos, player.view.up);

		// look at / interact with objects
		const ray = vec3.sub([], player.view.focusPos, player.view.pos);
		const arb = scene.physicsWorld.rayCastClosest(player.view.pos, ray, 1.5); // meters of reach for look/interact
		const prevFocus = this.inFocus;
		if (arb) {
			const ent = scene.colliders.identifyEntity(arb.collisionObject);
			if (control.keyboard.pressed(control.Key.E)) {
				for (const ia of this.ux) {
					if (ia.interact(ent)) {
						break;
					}
				}
			}
			else {
				if (this.inFocus !== ent) {
					for (const ia of this.ux) {
						if (ia.hover(ent)) {
							break;
						}
					}
				}
			}
			this.inFocus = ent;
		}
		else {
			this.inFocus = 0;
		}
		if (prevFocus && prevFocus !== this.inFocus) {
			for (const ia of this.ux) {
				if (ia.blur(prevFocus)) {
					break;
				}
			}
		}

		// send update event to those interested
		for (const ua of this.framers) {
			ua.update(timeStep);
		}

	}
}

window.addEventListener("load", () => {
	sd.App.initialize({
		root: dom.$1(".stageholder"),
		width: 1024,
		height: 576,
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
