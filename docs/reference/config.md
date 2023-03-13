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
         createManifest: true
      }
   }
};
```
