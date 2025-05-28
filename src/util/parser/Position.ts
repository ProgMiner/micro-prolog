

export interface Position {
    readonly row: number;
    readonly col: number;
}

export const Position = {

    initial: { row: 1, col: 0 },

    move: (offset: string, { row, col }: Position): Position => {
        for (const c of offset) {
            if (c == '\n') {
                ++row;
                col = 0;
            } else {
                ++col;
            }
        }

        return { row, col };
    },

    show: ({ row, col }: Position) => `${row}:${col}`,
};
