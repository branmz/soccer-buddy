import { idsInOrder, isSameSet, movePosition, moveToIndex, positionsOf } from '../ordering';

describe('moveToIndex', () => {
  it('moves an item to any place, shifting the others', () => {
    expect(moveToIndex([1, 2, 3, 4], 4, 0)).toEqual([4, 1, 2, 3]);
    expect(moveToIndex([1, 2, 3, 4], 1, 2)).toEqual([2, 3, 1, 4]);
    expect(moveToIndex([1, 2, 3, 4], 2, 2)).toEqual([1, 3, 2, 4]);
    expect(moveToIndex([1, 2, 3, 4], 3, 2)).toEqual([1, 2, 3, 4]);
  });

  it('clamps the target and ignores unknown ids', () => {
    expect(moveToIndex([1, 2, 3], 1, 9)).toEqual([2, 3, 1]);
    expect(moveToIndex([1, 2, 3], 3, -1)).toEqual([3, 1, 2]);
    expect(moveToIndex([1, 2, 3], 9, 0)).toEqual([1, 2, 3]);
  });
});

describe('isSameSet', () => {
  it('compares ids regardless of order', () => {
    expect(isSameSet([1, 2, 3], [3, 1, 2])).toBe(true);
    expect(isSameSet([1, 2], [1, 2, 3])).toBe(false);
    expect(isSameSet([1, 1, 2], [1, 2, 2])).toBe(false);
    expect(isSameSet([1, 2], [1, 3])).toBe(false);
  });
});

describe('positions during a drag', () => {
  const start = positionsOf([10, 20, 30, 40]);

  it('maps ids to their index and back', () => {
    expect(start).toEqual({ 10: 0, 20: 1, 30: 2, 40: 3 });
    expect(idsInOrder(start)).toEqual([10, 20, 30, 40]);
  });

  it('moves an item down or up, shifting the ones in between', () => {
    expect(idsInOrder(movePosition(start, 10, 0, 2))).toEqual([20, 30, 10, 40]);
    expect(idsInOrder(movePosition(start, 40, 3, 1))).toEqual([10, 40, 20, 30]);
    expect(movePosition(start, 20, 1, 1)).toEqual(start);
  });

  it('agrees with moveToIndex step by step', () => {
    let positions = start;
    positions = movePosition(positions, 10, 0, 1);
    positions = movePosition(positions, 10, 1, 2);
    positions = movePosition(positions, 10, 2, 3);
    expect(idsInOrder(positions)).toEqual(moveToIndex([10, 20, 30, 40], 10, 3));
  });
});
