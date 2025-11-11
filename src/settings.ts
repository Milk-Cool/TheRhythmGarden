export type SettingsValueType = "number" | "boolean" | "string";

export const settings: Record<string, SettingsValueType> = {
    hitSounds: "boolean",
    volume: "number"
};
const defaults: Record<keyof typeof settings, any> = {
    hitSounds: true,
    volume: .8
};
export type SettingName = keyof typeof settings;

type SettingType<T> = T extends "number" ? number : T extends "boolean" ? boolean : T extends "string" ? string : never;

export function getSetting<K extends keyof typeof settings>(name: K): SettingType<(typeof settings)[K]> {
    const rawValue = localStorage.getItem("_trg_" + name);
    if(rawValue === null) return defaults[name];
    return settings[name] === "number" ? parseFloat(rawValue) : settings[name] === "boolean" ? rawValue === "true" : settings[name];
}
export function setSetting<K extends keyof typeof settings>(name: K, value: SettingType<(typeof settings)[K]>): void {
    localStorage.setItem("_trg_" + name, value.toString());
}