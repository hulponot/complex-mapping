import {
	BufferGeometry,
	DoubleSide,
	Float32BufferAttribute,
	Mesh,
	MeshStandardMaterial
} from "three";

/*
	Plots surface:

		z = x + i y
		height = |f(z)|

	Returns:
		THREE.Mesh
*/
export function createComplexSurface(
	{
		reMin,
		reMax,
		imMin,
		imMax,
		resolution = 256,
		scale = 1
	}: {
		reMin: number;
		reMax: number;
		imMin: number;
		imMax: number;
		resolution?: number;
		scale?: number;
	},
	f: (re: number, im: number) => number
) {

	const positions: number[] = [];
	const indices: number[] = [];

	const width = reMax - reMin;
	const height = imMax - imMin;

	// -----------------------------------
	// vertices
	// -----------------------------------

	for (let iy = 0; iy <= resolution; iy++) {

		const v = iy / resolution;
		const im = imMin + v * height;

		for (let ix = 0; ix <= resolution; ix++) {

			const u = ix / resolution;
			const re = reMin + u * width;

			const value = f(re, im);

			// X axis -> Re
			const x = re;

			// Z axis -> Im
			const z = im;

			// Y axis -> |f(z)|
			const y = Math.abs(value) * scale;

			positions.push(x, y, z);
		}
	}

	// -----------------------------------
	// triangles
	// -----------------------------------

	const row = resolution + 1;

	for (let iy = 0; iy < resolution; iy++) {

		for (let ix = 0; ix < resolution; ix++) {

			const a = iy * row + ix;
			const b = a + 1;
			const c = a + row;
			const d = c + 1;

			// first triangle
			indices.push(a, c, b);

			// second triangle
			indices.push(b, c, d);
		}
	}

	// -----------------------------------
	// geometry
	// -----------------------------------

	const geometry = new BufferGeometry();

	geometry.setAttribute(
		"position",
		new Float32BufferAttribute(positions, 3)
	);

	geometry.setIndex(indices);

	geometry.computeVertexNormals();

	// -----------------------------------
	// material
	// -----------------------------------

	const material = new MeshStandardMaterial({
		color: 0x66ccff,
		side: DoubleSide,
		wireframe: false
	});

	return new Mesh(geometry, material);
}