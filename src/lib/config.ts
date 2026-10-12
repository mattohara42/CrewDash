import clubJson from "../../club.json" with { type: "json" };
import { parseClubConfig } from "../club.js";

export const club = parseClubConfig(clubJson);
