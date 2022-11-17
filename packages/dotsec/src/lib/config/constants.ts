import { DotsecConfig } from './types';

export const defaultConfig: DotsecConfig = {
    aws: {
        keyAlias: 'alias/top-secret',
    },
} as const;
