class InfoSphere implements Interactable {
	info: EntityInfo;

	hover(ent: entity.Entity) {
		if (ent === this.info.entity) {
			this.gameState.showMessage(this.msg);
			return true;
		}
		return false;
	}

	blur(_ent: entity.Entity) {
		return false;
	}

	interact(ent: entity.Entity) {
		if (ent === this.info.entity) {
			this.gameState.showMessage(this.msg);
			return true;
		}
		return false;
	}

	constructor(public gameState: GameState, public scene: sd.Scene, _cache: asset.CacheAccess, position: sd.Float3, public msg: string) {
		this.info = makeEntity(scene, {
			transform: {
				position
			},
			// geom: geometry.gen.generate(new geometry.gen.Sphere({ radius: 1.5, rows: 20, segs: 30 })),
			// renderer: {
			// 	materials: [makePBRMat(scene, cache("material", "Wax_01"))]
			// },
			rigidBody: {
				mass: 0,
				shape: physics.makeShape({ type: physics.PhysicsShapeType.Sphere, radius: 1.5 })!,
				isKinematic: true
			}
		});
	}
}


class HintBox implements Interactable {
	info: EntityInfo;
	msg: string;

	hover(ent: entity.Entity) {
		if (ent === this.info.entity) {
			this.gameState.showMessage(this.msg);
			return true;
		}
		return false;
	}

	blur(_ent: entity.Entity) {
		return false;
	}

	interact(ent: entity.Entity) {
		if (ent === this.info.entity) {
			this.gameState.showMessage(this.msg);
			return true;
		}
		return false;
	}

	constructor(public gameState: GameState, public scene: sd.Scene, _cache: asset.CacheAccess, public readonly which: "num" | "ring" | "grid") {
		let position: sd.Float3 = [0, 0, 0];
		let rotation: sd.Float4 = [0, 0, 0, 1];
		switch (which) {
			case "num":
				position = [-28.6, 4.3, 30.2];
				rotation = quat.fromEuler(0, math.deg2rad(0), 0);
				this.msg = `I've seen these before, they are numbers used by the ancients.\nThey are organized in a diamond shape.`;
				break;
			case "ring":
				position = [-3.8, 1.3, 4.5];
				rotation = quat.fromEuler(0, math.deg2rad(-70), 0);
				this.msg = `"Walk the path from tail to head to become one with the shadow."`;
				break;
			case "grid":
				position = [23, 1.3, 13.5];
				rotation = quat.fromEuler(0, math.deg2rad(35), 0);
				this.msg = `"Five marks eternal power".\n"Mark the fives to absorb the darkness."`;
				break;
			default:
				this.msg = "";
				break;
		}

		this.info = makeEntity(scene, {
			transform: {
				position,
				rotation
			},
			// geom: geometry.gen.generate(new geometry.gen.Box({ width: 2, height: 2, depth: .4 })),
			// renderer: {
			// 	materials: [makePBRMat(scene, cache("material", "Metal_Silver"))]
			// },
			rigidBody: {
				mass: 0,
				shape: physics.makeShape({ type: physics.PhysicsShapeType.Box, halfExtents: [1, 1, .2] })!,
				isKinematic: true,
				isTrigger: true
			}
		});
	}
}
