/* eslint-disable no-console */
import pino from 'pino';
// eslint-disable-next-line import/no-extraneous-dependencies
import pinoDebug from 'pino-debug';

import { Logger } from '../types';

// eslint-disable-next-line @typescript-eslint/naming-convention
let _logger: Logger;
export const getLogger = (): Logger => {
    if (!_logger) {
        if (!!process.env.DEBUG) {
            _logger = pino({ level: process.env.LEVEL || 'info' }, process.stderr);
            pinoDebug(_logger, {
                auto: true, // default
                map: {
                    'example:server': 'info',
                    'express:router': 'debug',
                    '*': 'trace', // everything else - trace
                },
            });
            // _logger = pino(pretty({}));
        } else {
            _logger = {
                info: (...args) => {
                    console.info(...args);
                },
                warn: (...args) => {
                    console.warn(...args);
                },
                error: (...args) => {
                    console.error(...args);
                },
                debug: (...args) => {
                    console.debug(...args);
                },
            };
        }
    }

    return _logger;
};
