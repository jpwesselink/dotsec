# config

## Usage

Create a dotsec.config.ts file in the current directory

```ts
import type { DotsecConfig } from "dotsec";

export const dotsec: DotsecConfig = {
    defaults: {
        options: {
            // Specify the .env file to use
            envFile: ".env",

            // Specify the .sec file to use
            secFile: ".sec",

            // Create encryption/decryption manifest file
            createManifest: true,

            /**
             * Setting this option to true will cause send env or sec variable values to stdout.
             * By default, this is disabled.
             */
            showRedacted: true,

            /**
             * Show output background color
             *
             * If set to true, the default output color will be used,
             * or you can specify one of the following:
             *
             * 	"black",
             * 	"red",
             * 	"green",
             * 	"yellow",
             * 	"blue",
             * 	"magenta",
             * 	"cyan",
             * 	"white",
             * 	"black-bright",
             * 	"gray",
             * 	"grey",
             * 	"red-bright",
             * 	"green-bright",
             * 	"yellow-bright",
             * 	"blue-bright",
             * 	"magenta-bright",
             * 	"cyan-bright",
             * 	"white-bright"
             */
            outputBackgroundColor: true | BackgroundColor,
        },
    },

    /**
     * This is where you can make exceptions for showing
     * specific env or sec variable values.
     */
    redaction?: {
        show: string[]
    }
};
```
