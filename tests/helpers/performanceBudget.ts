export interface PerformanceBudget {
  targetMs: number;
  enforce: boolean;
  strict: boolean;
  source: 'env' | 'default';
  mode: string;
  summary: string;
}

interface ResolveOptions {
  defaultTargetMs?: number;
  allowDisable?: boolean;
}

const parseEnvNumber = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

export const resolvePerformanceBudget = (options: ResolveOptions = {}): PerformanceBudget => {
  const { defaultTargetMs = 16, allowDisable = true } = options;

  const envTarget = parseEnvNumber(process.env.PERFORMANCE_TARGET_MS);
  const strict = process.env.PERFORMANCE_STRICT === 'true';
  const modeEnv = (process.env.PERFORMANCE_MODE ?? '').trim().toLowerCase();
  const disableRequested =
    allowDisable &&
    (process.env.PERFORMANCE_DISABLE === 'true' ||
      modeEnv === 'disabled' ||
      modeEnv === 'off' ||
      modeEnv === 'observe');

  const targetMs = envTarget ?? defaultTargetMs;
  const source: PerformanceBudget['source'] = envTarget ? 'env' : 'default';

  const enforce = disableRequested && !strict ? false : true;
  const activeMode = modeEnv || (strict ? 'strict' : 'default');

  const summaryParts = [`target ${targetMs}ms`, source === 'env' ? 'via PERFORMANCE_TARGET_MS' : 'default target'];
  if (strict) {
    summaryParts.push('strict mode enabled');
  }
  if (!enforce) {
    summaryParts.push('enforcement disabled');
  }

  return {
    targetMs,
    enforce,
    strict,
    source,
    mode: activeMode,
    summary: summaryParts.join(' · '),
  };
};
