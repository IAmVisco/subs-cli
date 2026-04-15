import pkg from "fs-extra";
const { remove } = pkg;
import { PREF_DIR } from "./preferences.js";

remove(PREF_DIR)
	.then(() => console.log("Preferences directory removed"))
	.catch((e) => console.error(e));
