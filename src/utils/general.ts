export const commaSeparate = (list: string[]) => {
    if (list.length === 1) return list[0];

    const last = list.pop()!;
    return `${list.join(", ")} and ${last}`;
};

export const getRandomNumberBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
