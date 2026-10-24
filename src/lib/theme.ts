// The viewer's theme choice lives in their browser (localStorage), so pages
// can stay statically rendered. "system" means: follow the device.
export const THEME_KEY = "mad-theme";
export type ThemeChoice = "system" | "light" | "dark";

/** Runs in <head> before first paint, so a saved Light/Dark choice never flashes. */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
