export const backgroundColors = [
	"black",
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"white",
	"black-bright",
	"gray",
	"grey",
	"red-bright",
	"green-bright",
	"yellow-bright",
	"blue-bright",
	"magenta-bright",
	"cyan-bright",
	"white-bright",
] as const;

export type BackgroundColor = typeof backgroundColors[number];
