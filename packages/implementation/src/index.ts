import dotsec from "dotsec";
import { dotsec as dotsecConfig } from "../../../dotsec.config";

void dotsec
	.config({
		sec: true,
		dotsecConfig,
	})
	.then(() => {
		console.log(process.env.MY_FANCY_ENV_VAR);
	});

console.log("hi");
