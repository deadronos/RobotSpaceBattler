import { LoopDriverOptions,useLoopDriver } from '../hooks/useLoopDriver';

export default function LoopDriver(props: LoopDriverOptions & { enabled?: boolean }) {
  const { enabled = true, ...opts } = props;
  useLoopDriver({ enabled, ...opts });
  return null;
}
