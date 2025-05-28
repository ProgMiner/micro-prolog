import { Position } from './Position';


export interface ParseState {
    readonly input: string;
    readonly position: Position;
}

export const ParseState = {

    initial: (input: string): ParseState => ({ input, position: Position.initial }),

    move: (offset: number, { input, position }: ParseState): ParseState => ({
        input: input.substring(offset),
        position: Position.move(input.substring(0, offset), position),
    }),

    error: (msg: string, state: ParseState): Error => {
        console.log('parsing error', msg, state);

        return new Error(`${msg} at ${Position.show(state.position)}`)
    },

    isEOF: ({ input }: ParseState): boolean => input == '',
};
