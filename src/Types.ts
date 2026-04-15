export interface ISubInfo {
	id: string;
	filename: string;
	url: string;
}

export interface IOpenSubtitles {
	subtitles(options: {
		query?: string;
		tmdb_id?: number;
		imdb_id?: number;
		file_id?: number;
		languages?: string;
		moviehash?: string;
		order_by?: string;
		order_direction?: string;
		page?: number;
		parent_feature_id?: number;
		parent_imdb_id?: number;
		parent_tmdb_id?: number;
		type?: "movie" | "episode" | "all";
		user_id?: number;
		year?: number;
		foreign_parts_only?: "include" | "only" | "exclude";
		trusted_sources?: "include" | "only" | "exclude";
		hearing_impaired?: "include" | "only" | "exclude";
		ai_translated?: "include" | "only" | "exclude";
		machine_translated?: "include" | "only" | "exclude";
	}): Promise<{ data: any[] }>;
	login(credentials: { username?: string; password?: string }): Promise<any>;
	download(options: { file_id: string }): Promise<{ link: string }>;
}

export interface ILanguage {
	name: string;
	alpha2: string;
	alpha3: string;
}
