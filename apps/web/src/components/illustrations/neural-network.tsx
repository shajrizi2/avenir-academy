import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

const LAYERS = [
  [50, 90, 130],
  [40, 76, 112, 148],
  [70, 110],
];
const XS = [52, 120, 188];

/** A doodled neural network: three layers of nodes wired together, with a spark of insight. */
export function NeuralNetwork({ className }: IllustrationProps) {
  const nodes = LAYERS.flatMap((ys, layer) => ys.map((y) => ({ x: XS[layer], y, layer })));
  const edges = nodes.flatMap((a) =>
    nodes.filter((b) => b.layer === a.layer + 1).map((b) => ({ a, b })),
  );
  return (
    <IllustrationSvg className={className}>
      <rect x="14" y="20" width="212" height="148" rx="24" className="fill-track-ai-tint" />
      {edges.map(({ a, b }) => (
        <line
          key={`${a.x}${a.y}-${b.x}${b.y}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          className="stroke-track-ai-shadow"
          strokeWidth={1.5}
          opacity={0.55}
        />
      ))}
      {nodes.map(({ x, y, layer }, i) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={layer === 1 ? 11 : 13}
          className={
            layer === 2
              ? 'fill-track-marketing'
              : layer === 0
                ? 'fill-background'
                : i % 2
                  ? 'fill-track-ai'
                  : 'fill-background'
          }
        />
      ))}
      <Sparkle x={206} y={36} r={14} className="fill-active" />
      <Sparkle x={30} y={150} r={8} className="fill-track-ai" />
    </IllustrationSvg>
  );
}
