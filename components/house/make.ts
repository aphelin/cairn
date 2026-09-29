import { buildHouse } from "./build";
import { bakeAO, bakeField, type AOData, type FieldData } from "./field";
import { buffers, pack, type Instance, type Mat, type Packed } from "./kit";

// The house and its baked light, made from nothing but the plan, as plain
// arrays. It runs in a worker (house.worker.ts), so building never holds up
// the page; if a worker can't start, the scene runs it here instead, pausing
// between steps.

export type Instances = { matrices: Float32Array; colours: Float32Array };

export type Built = {
  meshes: [Mat, Packed][];
  glow: Packed | null;
  glass: Packed | null;
  leaves: Instances;
  books: Instances;
  field: FieldData;
  ao: AOData;
};

function instances(list: Instance[]): Instances {
  const matrices = new Float32Array(list.length * 16);
  const colours = new Float32Array(list.length * 3);
  list.forEach((it, i) => {
    it.m.toArray(matrices, i * 16);
    colours.set([it.c.r, it.c.g, it.c.b], i * 3);
  });
  return { matrices, colours };
}

export async function make(pause: () => Promise<void>) {
  const kit = buildHouse();
  await pause();
  const { out, glow, glass } = kit.merged();
  const meshes = [...out].map(([mat, g]) => [mat, pack(g)] as [Mat, Packed]);
  const built: Omit<Built, "field" | "ao"> = {
    meshes,
    glow: glow ? pack(glow) : null,
    glass: glass ? pack(glass) : null,
    leaves: instances(kit.leaves),
    books: instances(kit.books),
  };
  await pause();
  const field = bakeField();
  await pause();
  const ao = bakeAO(kit.feet);
  const transfer = [
    ...meshes.flatMap(([, p]) => buffers(p)),
    ...buffers(built.glow),
    ...buffers(built.glass),
    built.leaves.matrices.buffer,
    built.leaves.colours.buffer,
    built.books.matrices.buffer,
    built.books.colours.buffer,
    field.data.buffer,
    field.all.buffer,
    field.study.buffer,
    ao.data.buffer,
  ] as ArrayBuffer[];
  return { built: { ...built, field, ao } as Built, transfer: [...new Set(transfer)] };
}
