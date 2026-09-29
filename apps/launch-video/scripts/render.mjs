// Render a composition to out/<id>.mp4 with a soundtrack that is provably in sync.
// Remotion renders the picture muted; the music pipeline lays the edit under it and measures
// the offset (see `master` in music/pipeline.py for why). Usage:
//   npm run render -- <CompositionId> [--scale=0.5] [--frames=0-599] [--concurrency=8]
// Remotion's progress (frames rendered and encoded) prints as it goes; a full-res film is slow,
// so review cuts go out at --scale=0.5.
import { spawnSync } from 'node:child_process';

const [id = 'Animatic', ...rest] = process.argv.slice(2);
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run('npx', ['remotion', 'render', 'src/index.ts', id, `out/${id}.silent.mp4`, '--muted', ...rest]);
run('uv', ['run', '--quiet', 'python', 'pipeline.py', 'master', `../out/${id}.silent.mp4`, `../out/${id}.mp4`], 'music');
