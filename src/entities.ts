function srgb8Color(r: number, g: number, b: number) {
	return [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];
}

let geomsToAllocate: geometry.Geometry[] = [];

function allocGeoms(scene: sd.Scene) {
	console.info("allocGeoms", geomsToAllocate.length);
	const rcb = new render.RenderCommandBuffer();
	for (const geom of geomsToAllocate) {
		rcb.allocate(geom);
	}
	geomsToAllocate = [];
	scene.rw.rd.dispatch(rcb);
}

interface EntityCreateOptions {
	parent?: entity.TransformInstance;
	transform?: entity.Transform;
	rigidBody?: physics.RigidBodyDescriptor;
	geom?: geometry.Geometry;
	renderer?: entity.MeshRendererDescriptor;
	light?: entity.Light;
}

interface EntityInfo {
	entity: entity.Entity;
	transform: entity.TransformInstance;
	collider: entity.ColliderInstance;
	mesh: entity.MeshInstance;
	renderer: entity.MeshRendererInstance;
	light: entity.LightInstance;
}

function makeEntity(scene: sd.Scene, options: EntityCreateOptions): EntityInfo {
	const entity = scene.entities.create();
	const info: EntityInfo = {
		entity,
		transform: scene.transforms.create(entity, options.transform, options.parent),
		collider: 0,
		mesh: 0,
		renderer: 0,
		light: 0
	};

	if (options.geom) {
		const mesh = scene.meshes.create(options.geom);
		scene.meshes.linkToEntity(mesh, entity);
		info.mesh = mesh;
		if (options.geom.renderResourceHandle === 0) {
			geomsToAllocate.push(options.geom);
		}
	}
	if (options.renderer) {
		info.renderer = scene.renderers.create(entity, options.renderer);
	}
	if (options.rigidBody) {
		info.collider = scene.colliders.create(entity, {
			rigidBody: options.rigidBody
		});
	}
	if (options.light) {
		info.light = scene.lights.create(entity, options.light);
	}

	return info;
}

function makePBRMat(scene: sd.Scene, mat: asset.Material) {
	const standard = scene.rw.effectByName("standard")!;
	const data = standard.makeEffectData() as render.effect.StandardEffectData;
	const pbr = mat as asset.StandardMaterial;

	vec3.copy(data.tint, pbr.colour.baseColour);
	vec3.copy(data.emissiveFactor, pbr.emissiveFactor);
	if (vec3.len(pbr.emissiveFactor) > 0) {
		data.emissiveFactor[3] = 1.0;
	}
	if (pbr.colour.colourTexture) {
		data.diffuse = pbr.colour.colourTexture.texture;
	}
	if (pbr.normalTexture) {
		data.normal = pbr.normalTexture.texture;
	}
	vec4.copy(data.texScaleOffset, [pbr.uvScale[0], pbr.uvScale[1], pbr.uvOffset[0], pbr.uvOffset[1]]);

	console.info("PBRMat", data);
	return data;
}

interface Interactable {
	hover(ent: entity.Entity): boolean;
	blur(ent: entity.Entity): boolean;
	interact(ent: entity.Entity): boolean;
}

interface Updateable {
	update(dt: number): void;
}

function isUpdateable(u: any): u is Updateable {
	return ("update" in u) && typeof u.update === "function";
}
