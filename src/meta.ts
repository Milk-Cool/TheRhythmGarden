export type Meta = {
    offset: number,
    startPos?: number,
    songName: string,
    songProducer: string,
    levelAuthor: string
};

export const defaultMeta: Meta = {
    offset: 0,
    startPos: 0,
    songName: "Unnamed",
    songProducer: "Unknown",
    levelAuthor: "Unspecified"
};