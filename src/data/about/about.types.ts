export interface TeamMember {
	name: string;
	role: string;
}

export interface AboutContent {
	mission: string;
	vision: string;
	history: string;
	team: TeamMember[];
}
