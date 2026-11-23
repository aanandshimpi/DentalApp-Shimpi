type Point = [number, number, number];
type Ring = [height: number, width: number, depth: number, cusp?: number];
type Face = { vertices: Point[]; root: boolean };

const crowns: Record<string, Ring[]> = {
  incisor: [[-.16,.29,.25],[.05,.36,.29],[.7,.47,.24],[1,.43,.16],[1.07,.29,.09],[1.09,0,0]],
  canine: [[-.16,.28,.25],[.1,.41,.33],[.58,.4,.31],[.88,.29,.23,.06],[1.12,.1,.1,.05],[1.18,0,0]],
  premolar: [[-.14,.32,.28],[.12,.43,.39],[.68,.55,.43,.06],[.97,.37,.3,.14],[1.02,.22,.18,.1],[1,0,0]],
  molar: [[-.15,.48,.36],[.08,.61,.48],[.63,.68,.53,.09],[.91,.52,.4,.12],[.94,.31,.24,.13],[.86,0,0]],
};

const meshCache = new Map<string, Face[]>();

function loft(faces: Face[], rings: Ring[], root: boolean, offsetX = 0, offsetZ = 0) {
  const sides = 24;
  const points = rings.map(([height, width, depth, cusp = 0], ring) =>
    Array.from({ length: sides }, (_, index): Point => {
      const angle = index * 2 * Math.PI / sides;
      const spread = root ? ring / (rings.length - 1) : 1;
      return [
        Math.cos(angle) * width + offsetX * spread,
        height + Math.cos(angle * 4) * cusp,
        Math.sin(angle) * depth + offsetZ * spread,
      ];
    }));
  for (let ring = 1; ring < points.length; ring++) {
    for (let vertex = 0; vertex < sides; vertex++) {
      const next = (vertex + 1) % sides;
      const vertices = [points[ring - 1][vertex], points[ring][vertex], points[ring][next], points[ring - 1][next]];
      faces.push({ vertices: root ? vertices.reverse() : vertices, root });
    }
  }
}

function toothMesh(tooth: string) {
  const quadrant = Number(tooth[0]);
  const position = Number(tooth[1]);
  const upper = [1, 2, 5, 6].includes(quadrant);
  const primary = quadrant >= 5;
  const kind = position <= 2 ? "incisor" : position === 3 ? "canine"
    : !primary && position <= 5 ? "premolar" : "molar";
  const key = `${kind}-${upper}-${primary}`;
  const cached = meshCache.get(key);
  if (cached) return cached;

  const faces: Face[] = [];
  loft(faces, crowns[kind], false);
  if (kind === "molar") {
    loft(faces, [[.12,.43,.32],[-.32,.35,.25]], true);
    for (const [x, z] of upper ? [[-.55,.23],[.46,.23],[.12,-.49]] : [[-.49,0],[.48,0]]) {
      loft(faces, [[-.15,.23,.21],[-.58,.19,.15],[-1.02,.14,.1],[-1.4,.06,.06],[-1.53,0,0]], true, x, z);
    }
  } else {
    const length = kind === "canine" ? 1.7 : 1.46;
    loft(faces, [[.15,.31,.28],[-.25,.27,.23],[-.64,.2,.18],[-1,.13,.12],
      [-length + .15,.06,.07],[-length,0,0]], true, kind === "canine" ? .15 : .06);
  }
  meshCache.set(key, faces);
  return faces;
}

function difference(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function paintTooth(ctx: CanvasRenderingContext2D, tooth: string, angle: number, upright: boolean) {
  const { width, height } = ctx.canvas;
  const turn = angle * Math.PI / 180;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const upper = "1256".includes(tooth[0]);
  const flip = upper && !upright ? -1 : 1;
  const scale = Math.min(width * .48, height * .3);
  ctx.clearRect(0, 0, width, height);

  const faces = toothMesh(tooth).map(({ vertices, root }) => {
    const points = vertices.map(([x, y, z]): Point => {
      const depth = x * sin + z * cos;
      return [(x * cos - z * sin) * flip, (y * .98 - depth * .20) * flip, y * .20 + depth * .98];
    });
    const [a,b,c,d] = points;
    const u = difference(b,a);
    const v = difference(d,a);
    const normal: Point = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const light = (normal[0] * -.38 + normal[1] * .40 + normal[2] * .83) / (Math.hypot(...normal) || 1);
    return { points, root, light, depth: (a[2] + b[2] + c[2] + d[2]) / 4 };
  }).sort((a,b) => a.depth - b.depth);

  for (const { points, light, root } of faces) {
    const shade = .68 + .30 * Math.max(0, light);
    const base = root ? [224, 218, 207] : [247, 244, 236];
    const color = `rgb(${base.map((channel) => Math.round(channel * shade)).join(",")})`;
    ctx.beginPath();
    for (const [index, [x,y,z]] of points.entries()) {
      const perspective = 1 / (1 - z * .095);
      const sx = width / 2 + x * scale * perspective;
      const sy = height / 2 - (y + .15 * flip) * scale * perspective;
      if (index === 0) ctx.moveTo(sx,sy);
      else ctx.lineTo(sx,sy);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = .7;
    ctx.fill();
    ctx.stroke();
  }
}
