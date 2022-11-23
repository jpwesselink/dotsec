import dotsec from "./dotsec";

void dotsec
	.config({
		sec: true,
	})
	.then(() => {
		console.log(process.env.MY_FANCY_ENV_VAR);
	});
