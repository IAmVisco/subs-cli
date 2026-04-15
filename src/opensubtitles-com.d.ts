declare module "opensubtitles.com" {
	export default class OS {
		constructor(settings: {
			apikey: string;
			endpoint?: string;
			useragent?: string;
		});
		login(auth: { username?: string; password?: string }): Promise<any>;
		logout(): Promise<any>;
		subtitles(params: any): Promise<any>;
		download(params: any): Promise<any>;
		[key: string]: any;
	}
}
