// eslint-disable-next-line @typescript-eslint/no-shadow
type LogFn = (obj: unknown, msg?: string, ...args: unknown[]) => void | ((msg: string, ...args: unknown[]) => void);

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Logger = {
    debug: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
};
