const INDEX_URL = "/levels/index.json";

export type LevelIndexLevel = {
    songName: string,
    songAuthor: string,
    levelAuthor: string,
    url: string
};

export async function fetchLevelIndex(): Promise<LevelIndexLevel[]> {
    const f = await fetch(INDEX_URL);
    const j = await f.json();
    return j;
}